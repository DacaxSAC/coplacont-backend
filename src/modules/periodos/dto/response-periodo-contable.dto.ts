import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para período contable
 */
export class ResponsePeriodoContableDto {
  /**
   * ID del período contable
   */
  @ApiProperty({
    description: 'ID único del período contable',
    example: 1,
  })
  id: number;

  /**
   * Año del período contable
   */
  @ApiProperty({
    description: 'Año del período contable',
    example: 2024,
  })
  año: number;

  /**
   * Fecha de inicio del período
   */
  @ApiProperty({
    description: 'Fecha de inicio del período',
    example: '2024-01-01',
  })
  fechaInicio: string;

  /**
   * Fecha de fin del período
   */
  @ApiProperty({
    description: 'Fecha de fin del período',
    example: '2024-12-31',
  })
  fechaFin: string;

  /**
   * Estado activo del período
   */
  @ApiProperty({
    description: 'Indica si el período está activo',
    example: true,
  })
  activo: boolean;

  /**
   * Estado cerrado del período
   */
  @ApiProperty({
    description: 'Indica si el período está cerrado',
    example: false,
  })
  cerrado: boolean;

  /**
   * Fecha de cierre del período
   */
  @ApiProperty({
    description: 'Fecha en que se cerró el período',
    example: '2025-01-15T10:30:00Z',
    required: false,
  })
  fechaCierre?: string;

  /**
   * Usuario que cerró el período
   */
  @ApiProperty({
    description: 'Usuario que cerró el período',
    example: 'admin@empresa.com',
    required: false,
  })
  usuarioCierre?: string;

  /**
   * Observaciones del período
   */
  @ApiProperty({
    description: 'Observaciones del período',
    example: 'Período contable 2024',
    required: false,
  })
  observaciones?: string;

  /**
   * Información de la persona/empresa
   */
  @ApiProperty({
    description: 'Información básica de la persona/empresa',
    example: {
      id: 1,
      razonSocial: 'Empresa SAC',
      ruc: '20123456789',
    },
  })
  persona: {
    id: number;
    razonSocial: string;
    ruc: string;
  };

  /**
   * Descripción del período
   */
  @ApiProperty({
    description: 'Descripción legible del período',
    example: 'Período 2024 (2024-01-01 - 2024-12-31)',
  })
  descripcion: string;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Fecha de creación del período',
    example: '2024-01-01T00:00:00Z',
  })
  fechaCreacion: string;

  /**
   * Fecha de actualización
   */
  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-01T00:00:00Z',
  })
  fechaActualizacion: string;
}
