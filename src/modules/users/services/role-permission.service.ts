import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { In, Repository } from 'typeorm';
import { CreateRolPermissionDto } from '../dto/role-permission/CreateRolPermission.dto';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createRolPermissionDto: CreateRolPermissionDto): Promise<void> {
    const role = await this.findRoleOrThrow(createRolPermissionDto.idRol);
    const permission = await this.findPermissionOrThrow(
      createRolPermissionDto.idPermission,
    );
    const rolePermission = this.rolePermissionRepository.create({
      role,
      permission,
    });
    await this.rolePermissionRepository.save(rolePermission);
  }

  async findPermissionsByRoles(roles: Role[]) {
    const roleIds = roles.map((role) => role.id);
    const permissionRoles = await this.rolePermissionRepository.find({
      where: { role: { id: In(roleIds) } },
      relations: ['permission'],
    });
    const permissions = permissionRoles.map((pr) => pr.permission);
    return permissions;
  }

  private async findRoleOrThrow(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Rol con id: ${id}, no fue encontrado`);
    }
    return role;
  }

  private async findPermissionOrThrow(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Rol con id: ${id}, no fue encontrado`);
    }
    return permission;
  }
}
