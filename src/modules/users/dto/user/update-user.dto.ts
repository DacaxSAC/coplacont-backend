import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@empresa.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Indica si el usuario está habilitado',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  habilitado?: boolean;

  @ApiProperty({
    description: 'Indica si es usuario principal de la empresa',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;

  @ApiProperty({
    description: 'Datos de la empresa asociada',
    required: false,
  })
  @IsOptional()
  persona?: {
    nombreEmpresa?: string;
    ruc?: string;
    razonSocial?: string;
    telefono?: string;
    direccion?: string;
  };
}
