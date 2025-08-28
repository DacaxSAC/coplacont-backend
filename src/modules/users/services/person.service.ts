import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Persona } from "../entities/persona.entity";
import { User } from "../entities/user.entity";
import { Repository, DataSource } from "typeorm";
import { CreatePersonaDto } from "../dto/persona/create-persona.dto";
import { CreatePersonaWithUserDto } from "../dto/persona/create-persona-with-user.dto";
import { UserService } from "./user.service";
import { CreateUserForPersonaDto } from "../dto/user/create-user-for-persona.dto";
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from './email.service';

@Injectable()
export class PersonaService {

    constructor(
        @InjectRepository(Persona) 
        private readonly personaRepository : Repository<Persona>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly dataSource: DataSource,
        private readonly emailService: EmailService ){
    }

    async create ( createPersonaDto : CreatePersonaDto) : Promise<Persona> {
        const persona = this.personaRepository.create(createPersonaDto);
        return await this.personaRepository.save(persona);
    }

    async findById(id: number): Promise<Persona | null> {
        return await this.personaRepository.findOne({ where: { id } });
    }

    async update(id: number, updatePersonaData: Partial<Persona>): Promise<Persona> {
        await this.personaRepository.update(id, updatePersonaData);
        const persona = await this.personaRepository.findOne({ where: { id } });
        if (!persona) {
            throw new Error(`Persona con ID ${id} no encontrada`);
        }
        return persona;
    }

    /**
     * Desactiva una empresa y todos sus usuarios asociados
     * @param id ID de la empresa
     */
    async disablePersonaAndUsers(id: number): Promise<void> {
        // Verificar que la empresa existe
        const persona = await this.personaRepository.findOne({ 
            where: { id },
            relations: ['usuarios']
        });
        
        if (!persona) {
            throw new Error(`Empresa con ID ${id} no encontrada`);
        }

        // Desactivar la empresa
        await this.personaRepository.update(id, { habilitado: false });

        // Desactivar todos los usuarios asociados a la empresa
        if (persona.usuarios && persona.usuarios.length > 0) {
            const userIds = persona.usuarios.map(user => user.id);
            await this.userRepository.update(userIds, { habilitado: false });
        }
    }

    /**
     * Busca una empresa por ID incluyendo sus usuarios
     * @param id ID de la empresa
     * @returns Empresa con usuarios asociados
     */
    async findByIdWithUsers(id: number): Promise<Persona | null> {
        return await this.personaRepository.findOne({ 
            where: { id },
            relations: ['usuarios']
        });
    }

    /**
     * Crea una nueva empresa junto con su usuario principal
     * @param createPersonaWithUserDto Datos de la empresa y usuario
     * @returns Empresa creada con usuario principal
     */
    async createPersonaWithUser(createPersonaWithUserDto: CreatePersonaWithUserDto): Promise<{ persona: Persona; usuario: any }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Crear la empresa
            const personaData: CreatePersonaDto = {
                nombreEmpresa: createPersonaWithUserDto.nombreEmpresa,
                ruc: createPersonaWithUserDto.ruc,
                razonSocial: createPersonaWithUserDto.razonSocial,
                telefono: createPersonaWithUserDto.telefono,
                direccion: createPersonaWithUserDto.direccion
            };

            const persona = queryRunner.manager.create(Persona, personaData);
            const savedPersona = await queryRunner.manager.save(persona);

            // Crear el usuario principal para la empresa
            const userForPersonaDto: CreateUserForPersonaDto = {
                nombre: createPersonaWithUserDto.nombreUsuario,
                email: createPersonaWithUserDto.emailUsuario,
                idRol: createPersonaWithUserDto.idRol,
                esPrincipal: createPersonaWithUserDto.esPrincipal ?? true
            };

            // Crear el usuario dentro de la misma transacción
            const passwordPlano = this.generateRandomPassword();
            const passwordHasheada = await this.hashPassword(passwordPlano);
            
            const user = queryRunner.manager.create(User, {
                nombre: userForPersonaDto.nombre,
                email: userForPersonaDto.email,
                contrasena: passwordHasheada,
                persona: savedPersona,
                esPrincipal: userForPersonaDto.esPrincipal || false,
            });
            
            const savedUser = await queryRunner.manager.save(user);
            
            // Crear la relación usuario-rol dentro de la transacción
            const userRole = queryRunner.manager.create('UserRole', {
                idUser: savedUser.id,
                idRole: userForPersonaDto.idRol,
            });
            
            await queryRunner.manager.save(userRole);
            
            // Enviar email después de confirmar la transacción
            const usuario = {
                id: savedUser.id,
                nombre: savedUser.nombre,
                email: savedUser.email,
                passwordPlano: passwordPlano
            };

            await queryRunner.commitTransaction();

            // Enviar email de bienvenida después de confirmar la transacción
            try {
                await this.emailService.sendWelcomeEmailWithCredentials(
                    usuario.email,
                    savedPersona.nombreEmpresa,
                    usuario.passwordPlano
                );
            } catch (error) {
                console.error('Error enviando email de bienvenida:', error);
            }

            return {
                persona: savedPersona,
                usuario: usuario
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Genera una contraseña aleatoria
     * @returns Contraseña aleatoria
     */
    private generateRandomPassword(): string {
        return randomBytes(8).toString('hex');
    }

    /**
     * Hashea una contraseña usando bcrypt
     * @param password Contraseña en texto plano
     * @returns Contraseña hasheada
     */
    private async hashPassword(password: string): Promise<string> {
        return await hash(password, 10);
    }

}