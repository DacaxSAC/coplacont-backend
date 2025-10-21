import { ApiProperty } from '@nestjs/swagger';
import { Persona } from '../../entities/persona.entity';
import { Role } from '../../entities/role.entity';

/**
 * DTO de respuesta para autenticación
 */
export class AuthResponseDto {
  @ApiProperty({
    example: 'Inicio de sesión exitoso',
    description: 'Mensaje de respuesta',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Indica si la operación fue exitosa',
  })
  success: boolean;

  @ApiProperty({
    example: 'Javier Castillo',
    description: 'Nombre del usuario',
    required: false,
  })
  nombre?: string;

  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
    required: false,
  })
  email?: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token JWT de autenticación',
    required: false,
  })
  jwt?: string;

  @ApiProperty({
    description: 'Datos de la persona asociada al usuario',
    required: false,
    type: () => Persona,
  })
  persona?: Persona;

  @ApiProperty({
    description: 'Roles asignados al usuario',
    required: false,
    type: [Role],
  })
  roles?: Role[];
}
