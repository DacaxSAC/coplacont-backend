import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from '../entities/permission.entity';
import { Repository } from 'typeorm';
import { ResponsePermissionDto } from '../dto/permission/response-permission.dto';
import { plainToInstance } from 'class-transformer';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<ResponsePermissionDto[]> {
    const permissions = await this.permissionRepository.find();
    return plainToInstance(ResponsePermissionDto, permissions, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<ResponsePermissionDto> {
    const permission = this.permissionRepository.create(createPermissionDto);
    const permissionSaved = await this.permissionRepository.save(permission);
    return plainToInstance(ResponsePermissionDto, permissionSaved, {
      excludeExtraneousValues: true,
    });
  }
}
