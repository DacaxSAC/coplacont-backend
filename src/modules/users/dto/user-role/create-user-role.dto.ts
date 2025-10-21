import { ApiProperty } from '@nestjs/swagger';

export class CreateUserRoleDto {
  @ApiProperty()
  idUser: number;
  @ApiProperty()
  idRole: number;
}
