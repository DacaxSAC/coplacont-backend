import { Body, Controller, Get, Post } from '@nestjs/common';
import { ResponsePermissionDto } from '../dto/permission/response-permission.dto';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';

@Controller('api/permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  findAll(): Promise<ResponsePermissionDto[]> {
    return this.permissionService.findAll();
  }

  @Post()
  create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<ResponsePermissionDto> {
    return this.permissionService.create(createPermissionDto);
  }
}
