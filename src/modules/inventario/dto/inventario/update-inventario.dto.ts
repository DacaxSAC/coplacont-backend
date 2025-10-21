import { PartialType } from '@nestjs/swagger';
import { CreateInventarioDto } from './create-inventario.dto';

/**
 * DTO para actualizar un registro de inventario existente
 * Extiende de CreateInventarioDto pero hace todos los campos opcionales
 */
export class UpdateInventarioDto extends PartialType(CreateInventarioDto) {}
