import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { PersonaService } from '../services/person.service';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { CreateUserForPersonaDto } from '../dto/user/create-user-for-persona.dto';
import { CreatePersonaWithUserDto } from '../dto/persona/create-persona-with-user.dto';
import { ResponseUserDto } from '../dto/user/response-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';

@ApiTags('Usuarios')
@Controller('api/user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly personaService: PersonaService
    ) { }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener usuario por ID' })
    @ApiParam({ 
        name: 'id',     
        description: 'ID del usuario', 
        example: 1 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Usuario encontrado exitosamente',
        type: ResponseUserDto,
        example: {
            id: 1,
            email: 'usuario@empresa.com',
            nombre: 'Juan Pérez',
            habilitado: true,
            esPrincipal: true,
            persona: {
                id: 1,
                nombreEmpresa: 'Mi Empresa SAC',
                ruc: '20123456789'
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    findById(@Param('id') id: number): Promise<ResponseUserDto> {
        return this.userService.findById(id);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los usuarios' })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de usuarios obtenida exitosamente',
        type: [ResponseUserDto],
        example: [
            {
                id: 1,
                email: 'admin@empresa.com',
                nombre: 'Administrador',
                habilitado: true,
                esPrincipal: true
            },
            {
                id: 2,
                email: 'contador@empresa.com',
                nombre: 'Contador',
                habilitado: true,
                esPrincipal: false
            }
        ]
    })
    findAll() {
        return this.userService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo usuario' })
    @ApiBody({ 
        type: CreateUserDto,
        examples: {
            ejemplo1: {
                summary: 'Usuario administrador',
                value: {
                    nombre: 'Juan Pérez',
                    email: 'juan.perez@empresa.com',
                    idPersona: 1,
                    idRol: 1,
                    esPrincipal: true
                }
            },
            ejemplo2: {
                summary: 'Usuario contador',
                value: {
                    nombre: 'María García',
                    email: 'maria.garcia@empresa.com',
                    idPersona: 1,
                    idRol: 2,
                    esPrincipal: false
                }
            }
        }
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Usuario creado exitosamente',
        type: ResponseUserDto
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'El email ya existe' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Patch('/:id')
    @ApiOperation({ summary: 'Actualizar usuario' })
    @ApiParam({ 
        name: 'id', 
        description: 'ID del usuario a actualizar', 
        example: 1 
    })
    @ApiBody({ 
        type: UpdateUserDto,
        examples: {
            ejemplo1: {
                summary: 'Actualizar nombre y email',
                value: {
                    nombre: 'Juan Carlos Pérez',
                    email: 'juan.carlos@empresa.com'
                }
            },
            ejemplo2: {
                summary: 'Cambiar rol',
                value: {
                    idRol: 3
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto): Promise<void> {
        return this.userService.update(id, updateUserDto);
    }

    @Patch(':id/disabled')
    @ApiOperation({ summary: 'Desactivar usuario (método legacy)' })
    @ApiParam({ 
        name: 'id', 
        description: 'ID del usuario a desactivar', 
        example: 1 
    })
    @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    disable(@Param('id') id: number): Promise<void> {
        return this.userService.softDelete(id);
    }

    /**
     * Crea un usuario asociado a una empresa específica
     * @param idPersona ID de la empresa
     * @param createUserForPersonaDto Datos del usuario a crear
     * @returns Usuario creado
     */
    @Post('persona/:idPersona')
    @ApiOperation({ 
        summary: 'Crear usuario para una empresa específica',
        description: 'Crea un nuevo usuario y lo asocia automáticamente a la empresa especificada. Se envía un email de bienvenida con credenciales temporales.'
    })
    @ApiParam({ 
        name: 'idPersona', 
        description: 'ID de la empresa a la que se asociará el usuario', 
        example: 1 
    })
    @ApiBody({ 
        type: CreateUserForPersonaDto,
        examples: {
            administrador: {
                summary: 'Usuario administrador de empresa',
                value: {
                    nombre: 'Carlos Administrador',
                    email: 'admin@nuevaempresa.com',
                    idRol: 1,
                    esPrincipal: true
                }
            },
            contador: {
                summary: 'Usuario contador',
                value: {
                    nombre: 'Ana Contadora',
                    email: 'contador@nuevaempresa.com',
                    idRol: 2,
                    esPrincipal: false
                }
            },
            vendedor: {
                summary: 'Usuario vendedor',
                value: {
                    nombre: 'Luis Vendedor',
                    email: 'ventas@nuevaempresa.com',
                    idRol: 3
                }
            }
        }
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Usuario creado exitosamente y asociado a la empresa',
        type: ResponseUserDto,
        example: {
            id: 5,
            email: 'admin@nuevaempresa.com',
            nombre: 'Carlos Administrador',
            habilitado: true,
            esPrincipal: true,
            persona: {
                id: 1,
                nombreEmpresa: 'Nueva Empresa SAC',
                ruc: '20987654321'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos o email ya existe' })
    @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
    createUserForPersona(
        @Param('idPersona') idPersona: number, 
        @Body() createUserForPersonaDto: CreateUserForPersonaDto
    ): Promise<ResponseUserDto> {
        return this.userService.createUserForPersona(createUserForPersonaDto, idPersona);
    }

    /**
     * Desactiva una empresa y todos sus usuarios asociados
     * @param idPersona ID de la empresa a desactivar
     */
    @Patch('persona/:idPersona/disabled')
    @ApiOperation({ 
        summary: 'Desactivar empresa y todos sus usuarios',
        description: 'Desactiva una empresa (persona jurídica) y automáticamente desactiva todos los usuarios asociados a ella. Esta acción es reversible.'
    })
    @ApiParam({ 
        name: 'idPersona', 
        description: 'ID de la empresa a desactivar', 
        example: 1 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Empresa y usuarios desactivados exitosamente',
        example: {
            message: 'Empresa y 3 usuarios asociados han sido desactivados exitosamente'
        }
    })
    @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
    @ApiResponse({ status: 400, description: 'Error al desactivar la empresa o sus usuarios' })
    disablePersonaAndUsers(@Param('idPersona') idPersona: number): Promise<void> {
        return this.personaService.disablePersonaAndUsers(idPersona);
    }

    /**
     * Desactiva un usuario individual
     * @param id ID del usuario a desactivar
     */
    @Patch(':id/disable')
    @ApiOperation({ 
        summary: 'Desactivar usuario individual',
        description: 'Desactiva un usuario específico sin afectar a otros usuarios de la misma empresa. El usuario no podrá acceder al sistema pero sus datos se conservan.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'ID del usuario a desactivar', 
        example: 5 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Usuario desactivado exitosamente',
        example: {
            message: 'Usuario desactivado exitosamente'
        }
    })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    @ApiResponse({ status: 400, description: 'Error al desactivar el usuario' })
    disableUser(@Param('id') id: number): Promise<void> {
        return this.userService.softDelete(id);
    }

    /**
     * Crea una nueva empresa junto con su usuario principal
     * @param createPersonaWithUserDto Datos de la empresa y usuario principal
     * @returns Empresa y usuario creados
     */
    @Post('empresa-con-usuario')
    @ApiOperation({ 
        summary: 'Crear empresa con usuario principal',
        description: 'Crea una nueva empresa (persona jurídica) junto con su usuario principal en una sola operación. El usuario principal tendrá acceso completo a la empresa y recibirá un email de bienvenida con credenciales temporales.'
    })
    @ApiBody({ 
        type: CreatePersonaWithUserDto,
        examples: {
            empresaCompleta: {
                summary: 'Empresa nueva con administrador',
                value: {
                    nombreEmpresa: 'Innovación Tech S.A.C.',
                    ruc: '20123456789',
                    razonSocial: 'INNOVACION TECH SOCIEDAD ANONIMA CERRADA',
                    telefono: '+51 999 888 777',
                    direccion: 'Av. Tecnológica 123, San Isidro, Lima',
                    nombreUsuario: 'Carlos Administrador',
                    emailUsuario: 'admin@innovaciontech.com',
                    idRol: 1,
                    esPrincipal: true
                }
            },
            empresaBasica: {
                summary: 'Empresa básica con datos mínimos',
                value: {
                    nombreEmpresa: 'Comercial ABC E.I.R.L.',
                    ruc: '20987654321',
                    razonSocial: 'COMERCIAL ABC EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA',
                    nombreUsuario: 'Ana Gerente',
                    emailUsuario: 'gerencia@comercialabc.com',
                    idRol: 1,
                    esPrincipal: true
                }
            }
        }
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Empresa y usuario principal creados exitosamente',
        example: {
            persona: {
                id: 10,
                nombreEmpresa: 'Innovación Tech S.A.C.',
                ruc: '20123456789',
                razonSocial: 'INNOVACION TECH SOCIEDAD ANONIMA CERRADA',
                telefono: '+51 999 888 777',
                direccion: 'Av. Tecnológica 123, San Isidro, Lima',
                habilitado: true,
                createdAt: '2024-01-15T10:30:00.000Z',
                updatedAt: '2024-01-15T10:30:00.000Z'
            },
            usuario: {
                id: 25,
                email: 'admin@innovaciontech.com',
                nombre: 'Carlos Administrador',
                habilitado: true,
                esPrincipal: true,
                persona: {
                    id: 10,
                    nombreEmpresa: 'Innovación Tech S.A.C.',
                    ruc: '20123456789'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos, RUC ya existe, o email ya registrado' })
    @ApiResponse({ status: 500, description: 'Error interno del servidor durante la transacción' })
    createPersonaWithUser(@Body() createPersonaWithUserDto: CreatePersonaWithUserDto): Promise<{ persona: any; usuario: any }> {
        return this.personaService.createPersonaWithUser(createPersonaWithUserDto);
    }

}
