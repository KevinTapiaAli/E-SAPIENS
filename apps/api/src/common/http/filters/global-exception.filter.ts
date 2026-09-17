import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type RequestWithId = Request & {
  id?: string;
};

const ERROR_CODES: Partial<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();

    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithId>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;

    let code = ERROR_CODES[statusCode] ?? 'HTTP_ERROR';

    let message = isHttpException ? exception.message : 'Internal server error';

    let details: Record<string, unknown> = {};

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as Record<string, unknown>;

      if (typeof body.code === 'string') {
        code = body.code;
      }

      if (Array.isArray(body.message)) {
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';

        details = {
          messages: body.message,
        };
      } else if (typeof body.message === 'string') {
        message = body.message;
      } else {
        const { statusCode: _statusCode, error: _error, ...rest } = body;

        details = rest;
      }
    }

    const requestId =
      request.id ?? String(response.getHeader('X-Request-Id') ?? '');

    response.status(statusCode).json({
      error: {
        code,
        message,
        details,
        requestId,
      },
    });
  }
}
