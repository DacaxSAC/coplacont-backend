import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'string@gmail.com',
  })
  @IsEmail()
  email: string;
  @ApiProperty({
    example: 'your password',
  })
  @MinLength(8)
  contraseña: string;
}
