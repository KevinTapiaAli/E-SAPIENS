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
  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  @IsString()
  @Length(1, 128)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ format: 'password', minLength: 15, maxLength: 128 })
  @IsString()
  @Length(15, 128)
  password: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  firstName: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  lastName: string;
}

export class ReviewAccountDto {
  @ApiProperty({ enum: ['aprobar', 'rechazar'] })
  @IsIn(['aprobar', 'rechazar'])
  decision: 'aprobar' | 'rechazar';

  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  reason: string;
}
