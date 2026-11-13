import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController, type OpenAPIObject } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('internal/openapi')
export class ServiceDocumentController {
  document?: OpenAPIObject;

  @Get()
  read() {
    if (!this.document) throw new ServiceUnavailableException();
    return this.document;
  }
}
