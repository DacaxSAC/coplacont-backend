import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';
import { CurrentUser } from '../../users/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../users/decorators/current-user.decorator';
import { CreateTransferenciaDto } from '../dto/transferencia/create-transferencia.dto';
import { ResponseTransferenciaDto } from '../dto/transferencia/response-transferencia.dto';
import { TransferenciaDetalleDto } from '../dto/transferencia/transferencia-detalle.dto';
import { TransferenciasService } from '../service/transferencias.service';

/**
 * Controlador para gestionar transferencias de productos entre almacenes.
 * Crea dos comprobantes dentro de una transacción:
 *  - Salida en almacén de origen (tipo operación 30, tipo comprobante 31).
 *  - Entrada en almacén de destino (tipo operación 29, tipo comprobante 31).
 * Genera movimientos de Kardex y procesa lotes conforme al método de valoración del período activo.
 */
@ApiTags('Transferencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(TransferenciaDetalleDto)
@Controller('api/transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Post()
  /**
   * Registra una transferencia entre dos almacenes para la empresa del usuario autenticado.
   * - Genera comprobante de salida en el almacén origen y de entrada en el almacén destino.
   * - Recalcula Kardex creando movimientos de salida/entrada con lotes correspondientes.
   *
   * @param user Usuario autenticado, usado para obtener `personaId`.
   * @param dto Datos de la transferencia, incluyendo almacenes y lista de productos.
   * @returns Comprobantes creados (salida y entrada) con sus relaciones principales.
   */
  @ApiOperation({ summary: 'Registrar transferencia entre almacenes' })
  @ApiBody({
    type: CreateTransferenciaDto,
    examples: {
      ejemploBasico: {
        summary: 'Transferencia simple entre dos almacenes',
        value: {
          idAlmacenOrigen: 1,
          idAlmacenDestino: 2,
          fechaEmision: '2025-11-15',
          moneda: 'PEN',
          tipoCambio: 3.8,
          serie: 'TR001',
          numero: '000123',
          detalles: [
            { idProducto: 101, cantidad: 10, unidadMedida: 'UND', descripcion: 'Producto A' },
            { idProducto: 102, cantidad: 5, unidadMedida: 'UND' },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transferencia registrada exitosamente', type: ResponseTransferenciaDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no proporcionado' })
  @ApiForbiddenResponse({ description: 'El usuario no tiene acceso a este recurso' })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransferenciaDto,
  ): Promise<ResponseTransferenciaDto> {
    const personaId = user.personaId as number;
    return this.transferenciasService.registerTransfer(dto, personaId);
  }
}