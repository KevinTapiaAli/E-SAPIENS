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
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
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
    const parserErrorType =
      !isHttpException &&
      exception !== null &&
      typeof exception === 'object' &&
      'type' in exception
        ? exception.type
        : undefined;
    const parserStatus =
      parserErrorType === 'entity.too.large' ||
      parserErrorType === 'parameters.too.many'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : parserErrorType === 'encoding.unsupported' ||
            parserErrorType === 'charset.unsupported'
          ? HttpStatus.UNSUPPORTED_MEDIA_TYPE
          : undefined;

    const statusCode = isHttpException
      ? exception.getStatus()
      : (parserStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;

    let code = ERROR_CODES[statusCode] ?? 'HTTP_ERROR';

    let message = isHttpException
      ? exception.message
      : parserStatus === HttpStatus.PAYLOAD_TOO_LARGE
        ? 'La solicitud supera el tamaño permitido.'
        : parserStatus === HttpStatus.UNSUPPORTED_MEDIA_TYPE
          ? 'El formato de la solicitud no está permitido.'
          : 'Internal server error';

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

    response.setHeader('Cache-Control', 'no-store');
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
