import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Persona } from "../entities/persona.entity";
import { Repository } from "typeorm";
import { CreatePersonaDto } from "../dto/persona/create-persona.dto";

@Injectable()
export class PersonaService {

    constructor(
        @InjectRepository(Persona) 
        private readonly personaRepository : Repository<Persona> ){
    }

    async create ( createPersonaDto : CreatePersonaDto) : Promise<Persona> {
        const persona = this.personaRepository.create(createPersonaDto);
        return await this.personaRepository.save(persona);
    }

}