import { ResponseRolDto } from '../rol/response-rol.dto';
import { ResponseUserDto } from '../user/response-user.dto';

export class ResponseUserRolDto {
  user: ResponseUserDto;
  roles: ResponseRolDto[];
}
