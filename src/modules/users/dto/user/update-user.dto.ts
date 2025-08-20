import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  habilitado?: boolean;

  @ApiProperty()
  @IsOptional()
  persona?: {
    primerNombre?: string;
    segundoNombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
    fechaNacimiento?: Date;
    telefono?: string;
    dni?: string;
    direccion?: string;
  };
}