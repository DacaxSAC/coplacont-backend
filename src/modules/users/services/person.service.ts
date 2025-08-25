import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Persona } from "../entities/persona.entity";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { CreatePersonaDto } from "../dto/persona/create-persona.dto";

@Injectable()
export class PersonaService {

    constructor(
        @InjectRepository(Persona) 
        private readonly personaRepository : Repository<Persona>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User> ){
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

}