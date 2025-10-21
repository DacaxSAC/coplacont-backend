import { PartialType } from '@nestjs/swagger';
import { CreateProductoDto } from './create-producto.dto';

/**
 * DTO para actualizar un producto existente
 * Extiende de CreateProductoDto pero hace todos los campos opcionales
 */
export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
