import { Body, Controller, Post } from '@nestjs/common';
import { RolePermissionService } from '../services/role-permission.service';
import { CreateRolPermissionDto } from '../dto/role-permission/CreateRolPermission.dto';

@Controller('api/role-permission')
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @Post()
  create(
    @Body() createRolPermissionDto: CreateRolPermissionDto,
  ): Promise<void> {
    return this.rolePermissionService.create(createRolPermissionDto);
  }
}
