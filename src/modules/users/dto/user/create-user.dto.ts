import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsBoolean,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { CreatePersonaDto } from '../persona/create-persona.dto';

/**
 * DTO para crear un nuevo usuario
 * La contraseña se genera automáticamente en el servicio
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'usuario@empresa.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiProperty({
    description: 'ID del rol a asignar al usuario',
  })
  idRol: number;

  @ApiProperty({
    description:
      'ID de la empresa (persona) a la que pertenece el usuario. Opcional para usuarios ADMIN',
    required: false,
  })
  @IsOptional()
  idPersona?: number;

  @ApiProperty({
    description: 'Indica si este usuario es el principal de la empresa',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiProperty({
    description:
      'Datos de la empresa (solo si se está creando una nueva empresa junto con el usuario)',
    required: false,
  })
  @IsOptional()
  createPersonaDto?: CreatePersonaDto;
}
