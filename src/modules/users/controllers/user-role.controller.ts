import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRolService } from '../services/user-role.service';
import { CreateUserRoleDto } from '../dto/user-role/create-user-role.dto';
import { ResponseUserRolDto } from '../dto/user-role/response-user-role.dto';

@Controller('api/user-role')
export class UserRoleController {
  constructor(private readonly userRolService: UserRolService) {}

  @Get()
  findAll(): Promise<ResponseUserRolDto[]> {
    return this.userRolService.findAll();
  }

  @Post()
  create(@Body() createUserRolDto: CreateUserRoleDto): Promise<void> {
    return this.userRolService.create(createUserRolDto);
  }
}
