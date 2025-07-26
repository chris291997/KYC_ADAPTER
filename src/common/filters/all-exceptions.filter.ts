import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorCode: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        errorCode = (errorResponse as any).error || 'HTTP_EXCEPTION';
      } else {
        message = errorResponse as string;
        errorCode = 'HTTP_EXCEPTION';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_ERROR';

      // Log the actual error for debugging
      this.logger.error(`Internal Server Error: ${exception.message}`, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      errorCode = 'UNKNOWN_ERROR';

      this.logger.error(`Unknown Error: ${JSON.stringify(exception)}`);
    }

    // Standardized error response format
    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: message,
        status: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
      // Include request ID if available (from logging interceptor)
      ...(request['requestId'] && { requestId: request['requestId'] }),
    };

    // Log all errors for monitoring
    this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`, {
      errorCode,
      status,
      path: request.url,
      method: request.method,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      ...(request['requestId'] && { requestId: request['requestId'] }),
    });

    response.status(status).json(errorResponse);
  }
}
