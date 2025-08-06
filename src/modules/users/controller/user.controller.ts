import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { ResponseUserDto } from '../dto/user/response-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';

@Controller('api/user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get(':id')
    findById(@Param('id') id: number): Promise<ResponseUserDto> {
        return this.userService.findById(id);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Patch('/:id')
    update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto): Promise<void> {
        return this.userService.update(id, updateUserDto);
    }

    @Patch(':id/disabled')
    disable(@Param('id') id: number): Promise<void> {
        return this.userService.softDelete(id);
    }

}
