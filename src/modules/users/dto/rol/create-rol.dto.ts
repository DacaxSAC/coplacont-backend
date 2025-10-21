import { ApiProperty } from '@nestjs/swagger';
import { RolEnum } from '../../enums/RoleEnum';

export class CreateRolDto {
  @ApiProperty()
  nombre: RolEnum;
}
