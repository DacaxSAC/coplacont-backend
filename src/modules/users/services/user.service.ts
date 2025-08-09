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
import { EmailService } from './email.service';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly personaService: PersonaService,
    private readonly userRoleRepository: UserRolService,
    private readonly emailService: EmailService
  ) { }


  async findById(id: number): Promise<ResponseUserDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    return plainToInstance(ResponseUserDto, user, { excludeExtraneousValues: true })
  }

  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find();
    return plainToInstance(ResponseUserDto, users, { excludeExtraneousValues: true, });
  }

  /**
   * Crea un nuevo usuario con contraseña autogenerada y envía email de bienvenida
   * @param createUserDto Datos del usuario a crear
   * @returns Usuario creado
   */
  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const persona = await this.personaService.create(createUserDto.createPersonaDto);
    
    const passwordPlano = this.generarPasswordAutogenerada();
    const passwordHasheada = await hash(passwordPlano, 10);
    
    const user = this.userRepository.create({
      email: createUserDto.email,
      contrasena: passwordHasheada,
      persona: persona,
    });
    
    const userSaved = await this.userRepository.save(user);
    
    await this.userRoleRepository.create({
      idUser: userSaved.id, 
      idRole: createUserDto.idRol,
    });
    
     try {
       await this.emailService.sendWelcomeEmailWithCredentials(
         createUserDto.email,
         `${persona.primerNombre} ${persona.primerApellido}`,
         passwordPlano
       );
     } catch (error) {
       console.error('Error enviando email de bienvenida:', error);
     }
    
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
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Busca un usuario por su token de recuperación de contraseña
   * @param token Token de recuperación
   * @returns Usuario si el token es válido y no ha expirado
   */
  async findByResetToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
      }
    });
  }

  /**
   * Actualiza el token de recuperación de contraseña del usuario
   * @param userId ID del usuario
   * @param token Token de recuperación
   * @param expiresAt Fecha de expiración del token
   */
  async updateResetPasswordToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await this.userRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expiresAt
    });
  }

  /**
   * Limpia el token de recuperación de contraseña del usuario
   * @param userId ID del usuario
   */
  async clearResetPasswordToken(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await this.userRepository.save(user);
    }
  }

  /**
   * Actualiza la contraseña del usuario
   * @param userId ID del usuario
   * @param hashedPassword Contraseña hasheada
   */
  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, {
      contrasena: hashedPassword
    });
  }

}
