import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    format: 'email',
    maxLength: 254,
    example: 'estudiante@example.test',
    description:
      'Sustituir por el correo de una cuenta aprobada creada en esta instalación.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    format: 'password',
    minLength: 1,
    maxLength: 128,
    writeOnly: true,
    description: 'Contraseña de tu cuenta. No hay contraseñas predeterminadas.',
  })
  @IsString()
  @Length(1, 128)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    format: 'email',
    maxLength: 254,
    example: 'solicitud@example.test',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    format: 'password',
    minLength: 15,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @Length(15, 128)
  password: string;

  @ApiProperty({ maxLength: 100, example: 'Ana' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  firstName: string;

  @ApiProperty({ maxLength: 100, example: 'Ejemplo' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  lastName: string;
}

export class ReviewAccountDto {
  @ApiProperty({ enum: ['aprobar', 'rechazar'], example: 'aprobar' })
  @IsIn(['aprobar', 'rechazar'])
  decision: 'aprobar' | 'rechazar';

  @ApiProperty({
    minLength: 5,
    maxLength: 500,
    example: 'Identidad revisada para la demostración académica.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  reason: string;
}
