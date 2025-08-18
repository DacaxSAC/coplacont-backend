import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class PersonaResponseDto {
    @Expose()
    @ApiProperty({ description: 'ID de la persona' })
    id: number;

    @Expose()
    @ApiProperty({ description: 'Primer nombre' })
    primerNombre: string;

    @Expose()
    @ApiProperty({ description: 'Segundo nombre' })
    segundoNombre: string;

    @Expose()
    @ApiProperty({ description: 'Primer apellido' })
    primerApellido: string;

    @Expose()
    @ApiProperty({ description: 'Segundo apellido' })
    segundoApellido: string;

    @Expose()
    @ApiProperty({ description: 'Fecha de nacimiento' })
    fechaNacimiento: Date;

    @Expose()
    @ApiProperty({ description: 'Teléfono' })
    telefono: string;

    @Expose()
    @ApiProperty({ description: 'DNI' })
    dni: string;
}

export class ResponseUserDto {
    @Expose()
    @ApiProperty({ description: 'ID del usuario' })
    id: number;

    @Expose()
    @ApiProperty({ description: 'Email del usuario' })
    email: string;

    @Expose()
    @ApiProperty({ description: 'Token de recuperación de contraseña', required: false })
    resetPasswordToken?: string;

    @Expose()
    @Type(() => PersonaResponseDto)
    @ApiProperty({ description: 'Datos de la persona asociada', type: PersonaResponseDto })
    persona: PersonaResponseDto;

    @Expose()
    @ApiProperty({ description: 'Roles del usuario', type: [String] })
    roles?: string[];
}