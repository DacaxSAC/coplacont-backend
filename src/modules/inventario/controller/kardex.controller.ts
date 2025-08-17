import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { KardexService } from '../service/kardex.service';
import { KardexRequestDto, KardexResponseDto } from '../dto';

@ApiTags('Kardex')
@Controller('api/kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  /**
   * Genera el reporte Kardex para un inventario específico
   */
  @Get()
  @ApiOperation({ 
    summary: 'Generar reporte Kardex',
    description: 'Muestra el detalle de movimientos y saldos del producto seleccionado, incluyendo inventario inicial (cantidad y costo total)'
  })
  @ApiQuery({ 
    name: 'idInventario', 
    description: 'ID del inventario para generar el kardex',
    example: 1,
    type: Number
  })
  @ApiQuery({ 
    name: 'fechaInicio', 
    description: 'Fecha de inicio del reporte (opcional)',
    example: '2024-01-01',
    required: false,
    type: String
  })
  @ApiQuery({ 
    name: 'fechaFin', 
    description: 'Fecha de fin del reporte (opcional)',
    example: '2024-12-31',
    required: false,
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reporte Kardex generado exitosamente',
    type: KardexResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Parámetros inválidos'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No se encontraron movimientos para el inventario especificado'
  })
  async generateKardex(
    @Query(new ValidationPipe({ transform: true })) query: KardexRequestDto
  ): Promise<KardexResponseDto> {
    return await this.kardexService.generateKardexReport(query);
  }
}