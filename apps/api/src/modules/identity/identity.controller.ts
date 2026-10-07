import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IsOptional, IsUUID } from 'class-validator';
import { IdentityService } from './identity.service';
import { IdentitySecurityService } from './identity-security.service';
import { LoginDto, RegisterDto, ReviewAccountDto } from './identity.dto';

class PendingQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
enum Role {
  Student = 'estudiante',
  Teacher = 'docente',
  Admin = 'administrador',
}

@ApiTags('Identity')
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Iniciar una sesión web de ocho horas en una cuenta aprobada',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiResponse({
    status: 403,
    description: 'Cuenta sin aprobación u origen no permitido',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.security.checkOrigin(request);
    await this.security.limit(request, 'login', dto.email);
    const { user, token } = await this.identity.login(
      dto,
      this.security.token(request),
    );
    this.security.setCookie(response, token);
    return user;
  }

  @Post('register')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Solicitar una cuenta de estudiante, pendiente de aprobación',
  })
  async register(@Body() dto: RegisterDto, @Req() request: Request) {
    this.security.checkOrigin(request);
    await this.security.limit(request, 'register', dto.email);
    return this.identity.register(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Revocar la sesión actual y eliminar su cookie' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.security.checkOrigin(request);
    await this.identity.logout(this.security.token(request));
    this.security.clearCookie(response);
    return { message: 'Sesión cerrada.' };
  }

  @Get('me')
  @ApiCookieAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar identidad, roles y permisos de la sesión',
  })
  me(@Req() request: Request) {
    return this.identity.authenticate(this.security.token(request));
  }

  @Get('dashboard/:role')
  @ApiCookieAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Consultar el panel autorizado, limitado a datos propios o asignados',
  })
  async dashboard(
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Req() request: Request,
  ) {
    return this.identity.dashboard(await this.me(request), role);
  }

  @Get('pending')
  @ApiCookieAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Administración: listar hasta 20 solicitudes por página',
  })
  async pending(@Query() query: PendingQuery, @Req() request: Request) {
    return this.identity.pending(await this.me(request), query.cursor);
  }

  @Post('accounts/:id/review')
  @ApiCookieAuth()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Administración: aprobar o rechazar una solicitud de estudiante con auditoría',
  })
  async review(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewAccountDto,
    @Req() request: Request,
  ) {
    this.security.checkOrigin(request);
    return this.identity.review(await this.me(request), id, dto);
  }
}
