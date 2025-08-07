import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';
import { CreatePersonaDto } from '../persona/create-persona.dto';
import { RolEnum } from '../../enums/RoleEnum';

export class CreateUserDto {
  @ApiProperty({
    example: 'string@gmail.com',
  })
  @IsEmail()
  email: string;
  @ApiProperty()
  idRol: number
  @ApiProperty()
  contrasena : string;
  @ApiProperty()
  createPersonaDto : CreatePersonaDto

}
