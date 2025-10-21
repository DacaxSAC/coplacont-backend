import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO para activar roles de una entidad (cliente o proveedor)
 * Solo permite activar roles, no desactivarlos
 */
export class ActivateRoleDto {
  @ApiProperty({
    example: true,
    description:
      'Activar rol de cliente (solo se puede activar, no desactivar)',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isCliente debe ser un valor booleano' })
  isCliente?: boolean;

  @ApiProperty({
    example: true,
    description:
      'Activar rol de proveedor (solo se puede activar, no desactivar)',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isProveedor debe ser un valor booleano' })
  isProveedor?: boolean;
}
