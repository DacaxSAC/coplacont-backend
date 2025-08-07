import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from '../dto/user/response-user.dto';
import { hash } from 'bcrypt'
import { PersonaService } from './person.service';
import { randomBytes } from 'crypto';
import { UserRolService } from './user-role.service';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly personaService: PersonaService,
    private readonly userRoleRepository: UserRolService
  ) { }


  async findById(id: number): Promise<ResponseUserDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    return plainToInstance(ResponseUserDto, user, { excludeExtraneousValues: true })
  }

  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find();
    return plainToInstance(ResponseUserDto, users, { excludeExtraneousValues: true, });
  }

  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const persona = await this.personaService.create(createUserDto.createPersonaDto);
    const passwordPlano = createUserDto.contrasena ?? this.generarPasswordAutogenerada();
    const passwordHasheada = await hash(passwordPlano, 10);
    const user = this.userRepository.create({
      email: createUserDto.email,
      contrasena: passwordHasheada,
      persona: persona,
    });
    const userSaved = await this.userRepository.save(user);
    this.userRoleRepository.create({
      idUser: userSaved.id, idRole: createUserDto.idRol,
    });
    return plainToInstance(ResponseUserDto, userSaved, {
      excludeExtraneousValues: true,
    });
  }

  generarPasswordAutogenerada(length: number = 12): string {
    return randomBytes(length).toString('base64').slice(0, length);
  }


  async update(id: number, updateUserDto: UpdateUserDto): Promise<void> {
    await this.userRepository.update(id, updateUserDto);
  }

  async softDelete(id: number): Promise<void> {
    await this.userRepository.update(id, { habilitado: false });
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } })
  }


}
