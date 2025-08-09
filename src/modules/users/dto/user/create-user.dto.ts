import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { CreatePersonaDto } from '../persona/create-persona.dto';
import { RolEnum } from '../../enums/RoleEnum';

/**
 * DTO para crear un nuevo usuario
 * La contraseña se genera automáticamente en el servicio
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'string@gmail.com',
    description: 'Email del usuario'
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;
  
  @ApiProperty({
    description: 'ID del rol a asignar al usuario'
  })
  idRol: number;
  
  @ApiProperty({
    description: 'Datos personales del usuario'
  })
  createPersonaDto: CreatePersonaDto;
}
