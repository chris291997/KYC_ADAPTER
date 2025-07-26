import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = uuidv4();

    // Add request ID to request object for use in other parts of the application
    request['requestId'] = requestId;

    // Add request ID to response headers
    response.setHeader('x-request-id', requestId);

    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming Request: ${method} ${url}`, {
      requestId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          // Log successful response
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
            {
              requestId,
              method,
              url,
              statusCode,
              responseTime,
              timestamp: new Date().toISOString(),
            },
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error?.status || 500;

          // Log error response
          this.logger.error(
            `Error Response: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
            {
              requestId,
              method,
              url,
              statusCode,
              responseTime,
              error: error?.message,
              timestamp: new Date().toISOString(),
            },
          );
        },
      }),
    );
  }
}
