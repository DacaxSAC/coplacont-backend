import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Persona } from '../entities/persona.entity';
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
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['persona', 'userRoles', 'userRoles.role']
    });
    const userDto = plainToInstance(ResponseUserDto, user, { excludeExtraneousValues: true });
    if (user?.userRoles) {
      userDto.roles = user.userRoles.map(ur => ur.role.nombre);
    }
    return userDto;
  }

  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.userRepository.find({
      relations: ['persona', 'userRoles', 'userRoles.role']
    });
    const usersDto = plainToInstance(ResponseUserDto, users, { excludeExtraneousValues: true, });
    return usersDto.map((userDto, index) => {
      if (users[index]?.userRoles) {
        userDto.roles = users[index].userRoles.map(ur => ur.role.nombre);
      }
      return userDto;
    });
  }

  /**
   * Crea un nuevo usuario con contraseña autogenerada y envía email de bienvenida
   * @param createUserDto Datos del usuario a crear
   * @returns Usuario creado
   */
  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    let persona: Persona | null = null;
    let nombreCompleto = 'Usuario';
    
    // Si se proporciona createPersonaDto, crear nueva empresa
    if (createUserDto.createPersonaDto) {
      persona = await this.personaService.create(createUserDto.createPersonaDto);
      nombreCompleto = createUserDto.createPersonaDto.nombreEmpresa;
    }
    // Si se proporciona idPersona, buscar empresa existente
    else if (createUserDto.idPersona) {
      persona = await this.personaService.findById(createUserDto.idPersona);
      if (!persona) {
        throw new Error(`Empresa con ID ${createUserDto.idPersona} no encontrada`);
      }
      nombreCompleto = persona.nombreEmpresa;
    }
    
    const passwordPlano = this.generarPasswordAutogenerada();
    const passwordHasheada = await hash(passwordPlano, 10);
    
    const user = this.userRepository.create({
      email: createUserDto.email,
      contrasena: passwordHasheada,
      persona: persona || undefined,
      esPrincipal: createUserDto.esPrincipal || false,
    });
    
    const userSaved = await this.userRepository.save(user);
    
    await this.userRoleRepository.create({
      idUser: userSaved.id, 
      idRole: createUserDto.idRol,
    });
    
     try {
       await this.emailService.sendWelcomeEmailWithCredentials(
         createUserDto.email,
         nombreCompleto,
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
    // Buscar el usuario con su persona asociada
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['persona']
    });

    if (!user) {
      throw new Error(`Usuario con ID ${id} no encontrado`);
    }

    // Extraer los datos de persona del DTO
    const { persona, ...userUpdateData } = updateUserDto;

    // Actualizar los datos del usuario (email, habilitado)
    if (Object.keys(userUpdateData).length > 0) {
      await this.userRepository.update(id, userUpdateData);
    }

    // Actualizar los datos de la persona si se proporcionaron
    if (persona && user.persona) {
      await this.personaService.update(user.persona.id, persona);
    }
  }

  async softDelete(id: number): Promise<void> {
    await this.userRepository.update(id, { habilitado: false });
  }

  /**
   * Busca un usuario por email incluyendo la relación con persona
   * @param email Email del usuario
   * @returns Usuario con datos de persona
   */
  async findByEmail(email: string) {
    return await this.userRepository.findOne({ 
      where: { email },
      relations: ['persona']
    });
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
  /**
   * Limpia el token de recuperación de contraseña del usuario
   * @param userId ID del usuario
   */
  async clearResetPasswordToken(userId: number): Promise<void> {
    await this.userRepository.query(
      'UPDATE "user" SET "resetPasswordToken" = NULL, "resetPasswordExpires" = NULL WHERE "id" = $1',
      [userId]
    );
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
