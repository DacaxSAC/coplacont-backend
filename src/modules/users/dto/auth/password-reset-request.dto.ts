import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para solicitar recuperación de contraseña
 */
export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'Email del usuario que solicita la recuperación',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;
}
