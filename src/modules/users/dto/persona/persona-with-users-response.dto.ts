import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la respuesta de usuario dentro de una persona
 */
export class UserInPersonaResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID del usuario' })
  id: number;

  @Expose()
  @ApiProperty({ description: 'Nombre del usuario' })
  nombre: string;

  @Expose()
  @ApiProperty({ description: 'Email del usuario' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Estado del usuario' })
  habilitado: boolean;

  @Expose()
  @ApiProperty({ description: 'Indica si es el usuario principal' })
  esPrincipal: boolean;

  @Expose()
  @ApiProperty({ description: 'Roles del usuario', type: [String] })
  roles: string[];

  @Expose()
  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;
}

/**
 * DTO para la respuesta de persona con sus usuarios
 */
export class PersonaWithUsersResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID de la persona/empresa' })
  id: number;

  @Expose()
  @ApiProperty({ description: 'Nombre de la empresa' })
  nombreEmpresa: string;

  @Expose()
  @ApiProperty({ description: 'RUC de la empresa' })
  ruc: string;

  @Expose()
  @ApiProperty({ description: 'Razón social de la empresa' })
  razonSocial: string;

  @Expose()
  @ApiProperty({ description: 'Teléfono de la empresa', required: false })
  telefono?: string;

  @Expose()
  @ApiProperty({ description: 'Dirección de la empresa', required: false })
  direccion?: string;

  @Expose()
  @ApiProperty({ description: 'Estado de la empresa' })
  habilitado: boolean;

  @Expose()
  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  @Expose()
  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: string;

  @Expose()
  @ApiProperty({ description: 'Total de usuarios' })
  totalUsuarios: number;

  @Expose()
  @ApiProperty({ description: 'Usuarios activos' })
  usuariosActivos: number;

  @Expose()
  @Type(() => UserInPersonaResponseDto)
  @ApiProperty({
    description: 'Lista de usuarios',
    type: [UserInPersonaResponseDto],
  })
  usuarios: UserInPersonaResponseDto[];
}
