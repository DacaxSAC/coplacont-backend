import { PartialType } from '@nestjs/swagger';
import { CreateCategoriaDto } from './create-categoria.dto';

/**
 * DTO para actualizar una categoría existente
 * Extiende de CreateCategoriaDto pero hace todos los campos opcionales
 */
export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}
