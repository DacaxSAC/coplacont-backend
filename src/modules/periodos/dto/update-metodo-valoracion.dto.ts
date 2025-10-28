import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

/**
 * DTO para actualizar el método de valoración en la configuración del período
 */
export class UpdateMetodoValoracionDto {
  @ApiProperty({
    description: 'Método de valoración de inventario',
    enum: MetodoValoracion,
    example: MetodoValoracion.FIFO,
  })
  @IsNotEmpty()
  @IsEnum(MetodoValoracion)
  metodoValoracion: MetodoValoracion;
}
