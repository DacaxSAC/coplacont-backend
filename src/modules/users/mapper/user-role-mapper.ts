import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from '../dto/user/response-user.dto';
import { ResponseUserRolDto } from '../dto/user-role/response-user-role.dto';
import { UserRole } from '../entities/user-role.entity';
import { ResponseRolDto } from '../dto/rol/response-rol.dto';

export class UserRoleMapper {
  static toResponse(userRoles: UserRole[]): ResponseUserRolDto[] {
    const grouped = new Map<number, ResponseUserRolDto>();

    for (const ur of userRoles) {
      if (!grouped.has(ur.user.id)) {
        grouped.set(ur.user.id, {
          user: plainToInstance(ResponseUserDto, ur.user, {
            excludeExtraneousValues: true,
          }),
          roles: [],
        });
      }
      grouped.get(ur.user.id)!.roles.push(
        plainToInstance(ResponseRolDto, ur.role, {
          excludeExtraneousValues: true,
        }),
      );
    }
    return Array.from(grouped.values());
  }
}
