import { PartialType } from '@nestjs/swagger';
import { CreateInventarioLoteDto } from './create-inventario-lote.dto';

/**
 * DTO para actualizar un lote de inventario existente
 * Extiende de CreateInventarioLoteDto pero hace todos los campos opcionales
 */
export class UpdateInventarioLoteDto extends PartialType(
  CreateInventarioLoteDto,
) {}
