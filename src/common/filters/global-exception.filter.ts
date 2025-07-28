import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ValidationError } from 'class-validator';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with context
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = Array.isArray(request.headers['x-request-id'])
      ? request.headers['x-request-id'][0]
      : request.headers['x-request-id'] || 'unknown';

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path, method, requestId);
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseException(exception, timestamp, path, method, requestId);
    }

    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      return this.handleValidationException(exception, timestamp, path, method, requestId);
    }

    // Handle unknown exceptions
    return this.handleUnknownException(exception, timestamp, path, method, requestId);
  }

  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    method: string,
    requestId: string,
  ) {
    const status = exception.getStatus();
    const response = exception.getResponse();

    return {
      success: false,
      statusCode: status,
      error: this.getErrorName(status),
      message: typeof response === 'string' ? response : (response as any).message,
      details: typeof response === 'object' ? response : undefined,
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private handleDatabaseException(
    exception: QueryFailedError,
    timestamp: string,
    path: string,
    method: string,
    requestId: string,
  ) {
    const message = this.getDatabaseErrorMessage(exception);
    const statusCode = this.getDatabaseErrorStatus(exception);

    return {
      success: false,
      statusCode,
      error: 'Database Error',
      message,
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private handleValidationException(
    errors: ValidationError[],
    timestamp: string,
    path: string,
    method: string,
    requestId: string,
  ) {
    const messages = errors.map((error) => Object.values(error.constraints || {}).join(', '));

    return {
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Validation Error',
      message: 'Input validation failed',
      details: messages,
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private handleUnknownException(
    exception: unknown,
    timestamp: string,
    path: string,
    method: string,
    requestId: string,
  ) {
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message,
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private getDatabaseErrorMessage(exception: QueryFailedError): string {
    const message = exception.message;

    // Handle common database constraints
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'A record with this information already exists';
    }

    if (message.includes('violates foreign key constraint')) {
      return 'Referenced record does not exist';
    }

    if (message.includes('violates not-null constraint')) {
      return 'Required field is missing';
    }

    if (message.includes('invalid input syntax for type uuid')) {
      return 'Invalid ID format provided';
    }

    return process.env.NODE_ENV === 'production' ? 'Database operation failed' : message;
  }

  private getDatabaseErrorStatus(exception: QueryFailedError): number {
    const message = exception.message;

    if (message.includes('duplicate key') || message.includes('already exists')) {
      return HttpStatus.CONFLICT;
    }

    if (message.includes('foreign key') || message.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }

    if (message.includes('not-null') || message.includes('invalid input syntax')) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }

  private logError(exception: unknown, request: Request, errorResponse: any): void {
    const { method, url, headers, body, params, query } = request;
    const userAgent = headers['user-agent'];
    const ip = request.ip;

    const context = {
      method,
      url,
      userAgent,
      ip,
      params,
      query,
      body: this.sanitizeBody(body),
      statusCode: errorResponse.statusCode,
      requestId: errorResponse.requestId,
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${errorResponse.error}: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : exception,
        JSON.stringify(context, null, 2),
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `${method} ${url} - ${errorResponse.error}: ${errorResponse.message}`,
        JSON.stringify(context, null, 2),
      );
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'authorization'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
