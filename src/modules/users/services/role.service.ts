import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../entities/role.entity';
import { Repository } from 'typeorm';
import { ResponseRolDto } from '../dto/rol/response-rol.dto';
import { plainToInstance } from 'class-transformer';
import { CreateRolDto } from '../dto/rol/create-rol.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findById(id: number): Promise<ResponseRolDto> {
    const role = await this.roleRepository.findOne({ where: { id } });
    return plainToInstance(ResponseRolDto, role, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<ResponseRolDto[]> {
    const roles = await this.roleRepository.find();
    return plainToInstance(ResponseRolDto, roles, {
      excludeExtraneousValues: true,
    });
  }

  async create(createRolDto: CreateRolDto): Promise<ResponseRolDto> {
    const role = this.roleRepository.create(createRolDto);
    const roleSaved = await this.roleRepository.save(role);
    return plainToInstance(ResponseRolDto, roleSaved, {
      excludeExtraneousValues: true,
    });
  }
}
