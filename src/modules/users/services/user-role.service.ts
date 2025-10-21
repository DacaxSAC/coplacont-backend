import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '../entities/user-role.entity';
import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserRoleDto } from '../dto/user-role/create-user-role.dto';
import { ResponseUserRolDto } from '../dto/user-role/response-user-role.dto';
import { UserRoleMapper } from '../mapper/user-role-mapper';
import { RolEnum } from '../enums/RoleEnum';

@Injectable()
export class UserRolService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<ResponseUserRolDto[]> {
    const userRoles = await this.userRoleRepository.find({
      relations: ['user', 'role'],
    });
    return UserRoleMapper.toResponse(userRoles);
  }

  async create(createUserRoleDto: CreateUserRoleDto): Promise<void> {
    const user = await this.findUserOrThrow(createUserRoleDto.idUser);
    const role = await this.findRoleOrThrow(createUserRoleDto.idRole);
    const userRole = this.userRoleRepository.create({ user, role });
    await this.userRoleRepository.save(userRole);
  }

  async findRolesByUser(user: User): Promise<Role[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { user: { id: user.id } },
      relations: ['role'],
    });

    return userRoles.map((ur) => ur.role);
  }

  async assignUserToRole(user: User, roleEnum: RolEnum) {
    const role = await this.roleRepository.findOne({
      where: { nombre: roleEnum },
    });
    if (!role) {
      throw new Error(`El rol ${roleEnum} no existe`);
    }
    const userRole = this.userRoleRepository.create({ user, role });
    await this.userRoleRepository.save(userRole);
  }

  private async findUserOrThrow(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con id: ${id}, no fue encontrado`);
    }
    return user;
  }

  private async findRoleOrThrow(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Rol con id: ${id}, no fue encontrado`);
    }
    return role;
  }
}
