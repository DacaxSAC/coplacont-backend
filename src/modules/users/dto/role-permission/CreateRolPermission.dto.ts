import { ApiProperty } from '@nestjs/swagger';

export class CreateRolPermissionDto {
  @ApiProperty()
  idRol: number;
  @ApiProperty()
  idPermission: number;
}
