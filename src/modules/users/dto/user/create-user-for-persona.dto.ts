import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * DTO para crear un usuario asociado a una empresa específica
 */
export class CreateUserForPersonaDto {
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @IsNumber()
  idRol: number;

  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;
}
