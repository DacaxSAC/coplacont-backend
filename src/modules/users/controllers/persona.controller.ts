import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PersonaService } from '../services/person.service';
import {PersonaWithUsersResponseDto, UserInPersonaResponseDto} from '../dto/persona/persona-with-users-response.dto';
import { plainToInstance } from 'class-transformer';

/**
 * Controlador para gestionar personas (empresas) y sus usuarios asociados
 */
@ApiTags('Personas/Empresas')
@Controller('api/persona')
export class PersonaController {
    constructor(private readonly personaService: PersonaService) {}

    /**
     * Obtiene todas las personas (empresas) con sus usuarios asociados
     * @returns Lista de empresas con usuarios
     */
    @Get()
    @ApiOperation({ 
        summary: 'Obtener todas las empresas con sus usuarios',
        description: 'Retorna una lista completa de todas las empresas registradas junto con sus usuarios asociados, incluyendo roles y estado de cada usuario.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de empresas con usuarios obtenida exitosamente',
        type: [PersonaWithUsersResponseDto],
        example: [
            {
                id: 1,
                nombreEmpresa: 'Empresa Ejemplo SAC',
                ruc: '20123456789',
                razonSocial: 'Empresa Ejemplo Sociedad Anónima Cerrada',
                telefono: '+51 999 888 777',
                direccion: 'Av. Principal 123, Lima',
                habilitado: true,
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
                totalUsuarios: 3,
                usuariosActivos: 2,
                usuarios: [
                    {
                        id: 1,
                        nombre: 'Juan Pérez',
                        email: 'juan.perez@empresa.com',
                        habilitado: true,
                        esPrincipal: true,
                        roles: ['Administrador']
                    },
                    {
                        id: 2,
                        nombre: 'María García',
                        email: 'maria.garcia@empresa.com',
                        habilitado: true,
                        esPrincipal: false,
                        roles: ['Contador']
                    },
                    {
                        id: 3,
                        nombre: 'Carlos López',
                        email: 'carlos.lopez@empresa.com',
                        habilitado: false,
                        esPrincipal: false,
                        roles: ['Usuario']
                    }
                ]
            }
        ]
    })
    @ApiResponse({ 
        status: 500, 
        description: 'Error interno del servidor' 
    })
    async findAllWithUsers(): Promise<PersonaWithUsersResponseDto[]> {
        const personas = await this.personaService.findAllWithUsers();
        
        return personas.map(persona => {
            const personaDto = plainToInstance(PersonaWithUsersResponseDto, persona, {
                excludeExtraneousValues: true
            });

            // Mapear usuarios con sus roles
            if (persona.usuarios) {
                personaDto.usuarios = persona.usuarios.map(user => {
                    const userDto = plainToInstance(UserInPersonaResponseDto, user, {
                        excludeExtraneousValues: true
                    });
                    
                    // Extraer roles del usuario
                    if (user.userRoles) {
                        userDto.roles = user.userRoles.map(ur => ur.role.nombre);
                    }
                    
                    return userDto;
                });

                // Calcular estadísticas
                personaDto.totalUsuarios = persona.usuarios.length;
                personaDto.usuariosActivos = persona.usuarios.filter(user => user.habilitado).length;
            } else {
                personaDto.usuarios = [];
                personaDto.totalUsuarios = 0;
                personaDto.usuariosActivos = 0;
            }

            return personaDto;
        });
    }

    /**
     * Obtiene una empresa específica con sus usuarios asociados
     * @param id ID de la empresa
     * @returns Empresa con usuarios asociados
     */
    @Get(':id')
    @ApiOperation({ 
        summary: 'Obtener empresa por ID con sus usuarios',
        description: 'Retorna los datos de una empresa específica junto con todos sus usuarios asociados, incluyendo roles y estado de cada usuario.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'ID de la empresa', 
        example: 1,
        type: 'number'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Empresa encontrada exitosamente',
        type: PersonaWithUsersResponseDto,
        example: {
            id: 1,
            nombreEmpresa: 'Empresa Ejemplo SAC',
            ruc: '20123456789',
            razonSocial: 'Empresa Ejemplo Sociedad Anónima Cerrada',
            telefono: '+51 999 888 777',
            direccion: 'Av. Principal 123, Lima',
            habilitado: true,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
            totalUsuarios: 2,
            usuariosActivos: 2,
            usuarios: [
                {
                    id: 1,
                    nombre: 'Juan Pérez',
                    email: 'juan.perez@empresa.com',
                    habilitado: true,
                    esPrincipal: true,
                    roles: ['Administrador']
                },
                {
                    id: 2,
                    nombre: 'María García',
                    email: 'maria.garcia@empresa.com',
                    habilitado: true,
                    esPrincipal: false,
                    roles: ['Contador']
                }
            ]
        }
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Empresa no encontrada' 
    })
    @ApiResponse({ 
        status: 400, 
        description: 'ID de empresa inválido' 
    })
    async findByIdWithUsers(@Param('id', ParseIntPipe) id: number): Promise<PersonaWithUsersResponseDto | null> {
        const persona = await this.personaService.findByIdWithUsers(id);
        
        if (!persona) {
            return null;
        }

        const personaDto = plainToInstance(PersonaWithUsersResponseDto, persona, {
            excludeExtraneousValues: true
        });

        // Mapear usuarios con sus roles
        if (persona.usuarios) {
            personaDto.usuarios = persona.usuarios.map(user => {
                const userDto = plainToInstance(UserInPersonaResponseDto, user, {
                    excludeExtraneousValues: true
                });
                
                // Extraer roles del usuario
                if (user.userRoles) {
                    userDto.roles = user.userRoles.map(ur => ur.role.nombre);
                }
                
                return userDto;
            });

            // Calcular estadísticas
            personaDto.totalUsuarios = persona.usuarios.length;
            personaDto.usuariosActivos = persona.usuarios.filter(user => user.habilitado).length;
        } else {
            personaDto.usuarios = [];
            personaDto.totalUsuarios = 0;
            personaDto.usuariosActivos = 0;
        }

        return personaDto;
    }
}