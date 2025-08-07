import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from '../dto/user/response-user.dto';
import { hash } from 'bcrypt'

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}


  async findById(id: number) : Promise<ResponseUserDto>{
    const user = await this.userRepository.findOne({ where: { id } });
    return plainToInstance(ResponseUserDto , user , {excludeExtraneousValues: true})
  }

  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find();
    return plainToInstance(ResponseUserDto, users, {excludeExtraneousValues: true,});
  }
  
  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const user = this.userRepository.create(createUserDto);
    user.contrasena = await hash(createUserDto.contrasena, 10);
    const userSaved = await this.userRepository.save(user);
    return plainToInstance(ResponseUserDto, userSaved, {
      excludeExtraneousValues: true,
    });
  }
  

  async update(id: number, updateUserDto: UpdateUserDto): Promise<void> {
    await this.userRepository.update(id, updateUserDto);
  }
  
  async softDelete(id: number): Promise<void> {
    await this.userRepository.update(id, { habilitado: false });
  }

  async findByEmail (email: string) {
    return await this.userRepository.findOne({where: {email}})
  }
  

}
