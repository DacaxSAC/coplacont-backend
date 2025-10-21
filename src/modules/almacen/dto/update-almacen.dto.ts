import { PartialType } from '@nestjs/swagger';
import { CreateAlmacenDto } from './create-almacen.dto';

/**
 * DTO para actualizar un almacén existente
 * Extiende de CreateAlmacenDto pero hace todos los campos opcionales
 */
export class UpdateAlmacenDto extends PartialType(CreateAlmacenDto) {}
