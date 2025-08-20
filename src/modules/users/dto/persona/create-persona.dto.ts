import { ApiProperty } from "@nestjs/swagger";

export class CreatePersonaDto {
    @ApiProperty()
    primerNombre: string;
    @ApiProperty()
    segundoNombre: string;
    @ApiProperty()
    primerApellido: string;
    @ApiProperty()
    segundoApellido: string;
    @ApiProperty()
    fechaNacimiento: Date;
    @ApiProperty()
    telefono: string;
    @ApiProperty()
    dni: string;
    @ApiProperty({ required: false, default: 'DNI' })
    tipoDocumento?: string;
    @ApiProperty({ required: false })
    direccion?: string;
}