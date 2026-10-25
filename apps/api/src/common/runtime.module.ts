import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { GlobalExceptionFilter } from './http/filters/global-exception.filter';

@Global()
@Module({
  exports: [ConfigModule, LoggerModule],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const incomingRequestId = req.headers['x-request-id'];

              const requestId =
                typeof incomingRequestId === 'string' &&
                /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(incomingRequestId)
                  ? incomingRequestId
                  : randomUUID();

              res.setHeader('X-Request-Id', requestId);

              return requestId;
            },

            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers["x-internal-service-token"]',
                'req.headers.cookie',
                'req.headers["x-esapiens-visitor"]',
                'res.headers["set-cookie"]',
                'req.body.password',
              ],
              censor: '[REDACTED]',
            },

            customProps: () => ({
              service:
                configService.get<string>('SERVICE_NAME') ?? 'esapiens-api',
            }),

            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                },
          },
        };
      },
    }),
  ],

  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class RuntimeModule {}
