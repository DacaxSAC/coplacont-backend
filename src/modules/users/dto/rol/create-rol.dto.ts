import { ApiProperty } from "@nestjs/swagger";

export class CreateRolDto {
    @ApiProperty()
    nombre : string;
}