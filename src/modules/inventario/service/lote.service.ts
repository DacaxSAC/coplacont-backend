import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Inventario, InventarioLote } from '../entities';
import { ComprobanteDetalle } from '../../comprobantes/entities/comprobante-detalle';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

@Injectable()
export class LoteService {
  constructor(
    @InjectRepository(InventarioLote)
    private readonly loteRepository: Repository<InventarioLote>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
  ) {}

  /**
   * Procesar lotes según el tipo de operación del comprobante
   */
  async procesarLotesComprobante(
    detalles: ComprobanteDetalle[],
    tipoOperacion: TipoOperacion,
    metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO,
  ): Promise<{costoUnitario: number[], lotes: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[]}> {
    let costosUnitariosDeDetalles: number[] = [];
    let lotesUsados: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];

    try {
      for (let i = 0; i < detalles.length; i++) {
        const detalle = detalles[i];

        if (tipoOperacion === TipoOperacion.COMPRA) {
          await this.registrarLoteCompra(detalle);
        } else {
          // Para ventas y otras operaciones (salidas)
          if (metodoValoracion === MetodoValoracion.PROMEDIO) {
            // Para promedio ponderado, usar el costo promedio existente
            const resultadoVenta = await this.usarPromedioExistente(
              detalle.inventario.id,
              Number(detalle.cantidad),
            );
            costosUnitariosDeDetalles.push(resultadoVenta.costoUnitario);
            lotesUsados.push(...resultadoVenta.lotes);
          } else {
            // Para el método FIFO, usar la lógica original
            const {costoUnitario, lotes} = await this.actualizarStockVenta(
              detalle,
              metodoValoracion,
            );
            costosUnitariosDeDetalles.push(costoUnitario);
            lotesUsados.push(...lotes);
          }
          console.log(
            `Costo unitario calculado: ${costosUnitariosDeDetalles[costosUnitariosDeDetalles.length - 1]} de detalle ${i + 1}`,
            detalle,
          );
          console.log(
            `Lotes usados: ${lotesUsados} de detalle ${i + 1}`,
            detalle,
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error en procesamiento de lotes:`, error.message);
      throw error;
    }
    return {costoUnitario: costosUnitariosDeDetalles, lotes: lotesUsados};
  }

  /**
   * Registrar nuevo lote para compras
   */
  /**
   * Calcular nuevo costo promedio ponderado con entrada de mercancía
   * Solo se ejecuta en compras para recalcular el promedio
   */
  private async calcularNuevoPromedioConEntrada(
    inventarioId: number,
    cantidadNueva: number,
    costoNuevo: number
  ): Promise<number> {
    console.log(
      `🔄 Calculando nuevo promedio con entrada: Inventario=${inventarioId}, Cantidad=${cantidadNueva}, Costo=${costoNuevo}`
    );

    // Obtener lotes existentes con stock
    const lotesExistentes = await this.loteRepository.find({
      where: { 
        inventario: { id: inventarioId },
        cantidadActual: MoreThan(0)
      },
      order: { fechaIngreso: 'ASC' }
    });

    let cantidadTotalExistente = 0;
    let valorTotalExistente = 0;

    // Calcular totales de inventario existente
    for (const lote of lotesExistentes) {
      const cantidad = Number(lote.cantidadActual);
      const costo = Number(lote.costoUnitario);
      cantidadTotalExistente += cantidad;
      valorTotalExistente += cantidad * costo;
    }

    // Calcular nuevo promedio ponderado incluyendo la nueva entrada
    const cantidadTotalNueva = cantidadTotalExistente + cantidadNueva;
    const valorTotalNuevo = valorTotalExistente + (cantidadNueva * costoNuevo);
    const nuevoCostoPromedio = cantidadTotalNueva > 0 ? valorTotalNuevo / cantidadTotalNueva : 0;

    console.log(
      `📊 Cálculo promedio: Existente(${cantidadTotalExistente} x ${valorTotalExistente/cantidadTotalExistente || 0}) + Nuevo(${cantidadNueva} x ${costoNuevo}) = ${nuevoCostoPromedio}`
    );

    return parseFloat(nuevoCostoPromedio.toFixed(4));
  }

  private async registrarLoteCompra(
    detalle: ComprobanteDetalle,
  ): Promise<void> {

    // Validar que el detalle tenga inventario
    if (!detalle.inventario || !detalle.inventario.id) {
      throw new Error('El detalle debe tener un inventario válido');
    }

    const inventario = await this.inventarioRepository.findOne({
      where: { id: detalle.inventario.id },
      relations: ['producto', 'almacen'],
    });

    if (!inventario) {
      throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
    }

    // Validar que el inventario tenga producto y almacén
    if (!inventario.producto) {
      throw new Error(
        `El inventario ${detalle.inventario.id} no tiene un producto asociado`,
      );
    }
    if (!inventario.almacen) {
      throw new Error(
        `El inventario ${detalle.inventario.id} no tiene un almacén asociado`,
      );
    }

    // Validar cantidad y precio
    const cantidad = Number(detalle.cantidad);
    const precioUnitario = Number(detalle.precioUnitario);

    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }
    if (precioUnitario < 0) {
      throw new Error('El precio unitario no puede ser negativo');
    }

    // Calcular nuevo costo promedio ponderado con la entrada
    const nuevoCostoPromedio = await this.calcularNuevoPromedioConEntrada(
      inventario.id,
      cantidad,
      precioUnitario
    );

    // Crear nuevo lote con información más detallada
    const lote = this.loteRepository.create({
      inventario: inventario,
      numeroLote: `LOTE-${Date.now()}-${inventario.id}-${inventario.producto.id}`,
      cantidadInicial: cantidad,
      cantidadActual: cantidad,
      costoUnitario: precioUnitario,
      fechaIngreso: new Date(),
      observaciones: `Lote creado automáticamente desde compra - ${detalle.descripcion || 'Sin descripción'}`,
    });

    await this.loteRepository.save(lote);

    // Actualizar stock e inventario con el nuevo costo promedio
    const stockActual = Number(inventario.stockActual) || 0;
    inventario.stockActual = stockActual + cantidad;
    inventario.costoPromedioActual = nuevoCostoPromedio;
    await this.inventarioRepository.save(inventario);

    console.log(
      `✅ Lote creado exitosamente: ID=${lote.id}, Inventario=${inventario.id}, Producto=${inventario.producto.id}, Almacén=${inventario.almacen.id}, Cantidad=${cantidad}, Stock actualizado=${inventario.stockActual}, Nuevo costo promedio=${nuevoCostoPromedio}`,
    );
  }

  /**
   * Actualizar stock para ventas (FIFO - First In, First Out o lote específico)
   */
  private async actualizarStockVenta(
    detalle: ComprobanteDetalle,
    metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO,
  ): Promise<{costoUnitario: number, lotes: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[]}> {

    //Buscamos el inventario que pertenece el detalle
    const inventario = await this.inventarioRepository.findOne({
      where: { id: detalle.inventario.id },
    });

    if (!inventario) {
      throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
    }

    const stockActualNum = Number(detalle.inventario.stockActual);
    const cantidadNum = Number(detalle.cantidad);

    if (stockActualNum < cantidadNum) {
      throw new Error(
        `Stock insuficiente. Disponible: ${stockActualNum}, Requerido: ${cantidadNum}`,
      );
    }

    let costoUnitarioPorAlgoritmoCosteo = 0;
    let lotes: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];

    if (detalle.idLote) {
      await this.actualizarLoteEspecifico(
        detalle.idLote,
        cantidadNum,
        inventario,
      );
      // Para lote específico, usar el costo del lote seleccionado
      const lote = await this.loteRepository.findOne({
        where: { id: detalle.idLote }
      });
      if (lote) {
        costoUnitarioPorAlgoritmoCosteo = Number(lote.costoUnitario);
        lotes = [{
          idLote: lote.id,
          costoUnitarioDeLote: Number(lote.costoUnitario),
          cantidad: cantidadNum
        }];
      }
    } else {
      // Usar método de valoración seleccionado
      switch (metodoValoracion) {
        case MetodoValoracion.FIFO:
          const {costoUnitario, lotes: lotesFIFO }= await this.actualizarLotesFIFO(
            inventario.id,
            cantidadNum,
          );
          costoUnitarioPorAlgoritmoCosteo=costoUnitario;
          lotes=lotesFIFO;
          break;

        case MetodoValoracion.PROMEDIO:
          const {costoUnitario: costoPromedio, lotes: lotesPromedio} = await this.actualizarLotesPromedio(inventario.id, cantidadNum);
          costoUnitarioPorAlgoritmoCosteo = costoPromedio;
          lotes = lotesPromedio;
          console.log(`🔍 PROMEDIO - Costo unitario calculado: ${costoUnitarioPorAlgoritmoCosteo}`);
          console.log(`🔍 PROMEDIO - Lotes afectados:`, lotes);
          break;
        default:
          const {costoUnitario: costoPromedioDefault, lotes: lotesPromedioDefault} = await this.actualizarLotesPromedio(inventario.id, cantidadNum);
          costoUnitarioPorAlgoritmoCosteo = costoPromedioDefault;
          lotes = lotesPromedioDefault;
      }
    }

    // Actualizar stock del inventario - Convertir a números
    inventario.stockActual = stockActualNum - cantidadNum;
    await this.inventarioRepository.save(inventario);


    return {costoUnitario: costoUnitarioPorAlgoritmoCosteo, lotes};
  }

  /**
   * Actualizar un lote específico
   */
  private async actualizarLoteEspecifico(
    loteId: number,
    cantidad: number,
    inventario: Inventario,
  ): Promise<void> {
    const lote = await this.loteRepository.findOne({
      where: { id: loteId, inventario: { id: inventario.id } },
    });

    if (!lote) {
      throw new Error(`Lote no encontrado: ${loteId}`);
    }

    const cantidadActualNum = Number(lote.cantidadActual);
    if (cantidadActualNum < cantidad) {
      throw new Error(
        `Stock insuficiente en el lote ${loteId}. Disponible: ${cantidadActualNum}, Requerido: ${cantidad}`,
      );
    }

    lote.cantidadActual = cantidadActualNum - cantidad;
    await this.loteRepository.save(lote);
  }

  /**
   * Actualizar lotes usando lógica FIFO
   */
  /**
   * Actualizar lotes usando lógica FIFO (First In, First Out)
   * Calcula el costo unitario promedio ponderado de los lotes consumidos
   */
  private async actualizarLotesFIFO(
    inventarioId: number,
    cantidad: number,
  ): Promise<{
    costoUnitario: number;
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    console.log(
      `🔄 FIFO: Procesando salida - Inventario=${inventarioId}, Cantidad=${cantidad}`
    );

    // Obtener lotes ordenados por fecha de ingreso (FIFO)
    const lotes = await this.loteRepository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.inventario', 'inventario')
      .where('inventario.id = :inventarioId', { inventarioId })
      .andWhere('lote.cantidadActual > 0')
      .orderBy('lote.fechaIngreso', 'ASC')
      .getMany();

    console.log(`📦 FIFO: Lotes disponibles encontrados: ${lotes.length}`);

    if (lotes.length === 0) {
      throw new Error(
        `FIFO: No hay lotes disponibles para la venta. Inventario: ${inventarioId}`,
      );
    }

    // Verificar stock suficiente
    const stockTotal = lotes.reduce(
      (total, lote) => total + Number(lote.cantidadActual), 0
    );

    if (stockTotal < cantidad) {
      throw new Error(
        `FIFO: Stock insuficiente. Disponible: ${stockTotal}, Requerido: ${cantidad}`
      );
    }

    let cantidadPendiente = cantidad;
    let costoTotalAcumulado = 0;
    let cantidadTotalConsumida = 0;
    let lotesAfectados: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[] = [];

    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;
      if (Number(lote.cantidadActual) <= 0) continue;

      const cantidadADescontar = Math.min(
        Number(lote.cantidadActual),
        cantidadPendiente,
      );

      if (cantidadADescontar > 0) {
        // Actualizar el lote físicamente
        lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
        cantidadPendiente -= cantidadADescontar;

        // Acumular para cálculo de costo promedio ponderado
        const costoUnitarioLote = Number(lote.costoUnitario);
        costoTotalAcumulado += cantidadADescontar * costoUnitarioLote;
        cantidadTotalConsumida += cantidadADescontar;

        // Registrar lote afectado
        lotesAfectados.push({
          idLote: lote.id,
          costoUnitarioDeLote: costoUnitarioLote,
          cantidad: cantidadADescontar,
        });

        await this.loteRepository.save(lote);
        
        console.log(
          `📦 FIFO: Lote ${lote.id} procesado - Consumido: ${cantidadADescontar}, Costo: ${costoUnitarioLote}, Restante: ${lote.cantidadActual}`
        );
      }
    }

    if (cantidadPendiente > 0) {
      throw new Error(
        `FIFO: No se pudo distribuir toda la cantidad. Pendiente: ${cantidadPendiente}`
      );
    }

    // Calcular costo unitario promedio ponderado de los lotes consumidos
    const costoUnitarioPromedioPonderado = cantidadTotalConsumida > 0 
      ? costoTotalAcumulado / cantidadTotalConsumida 
      : 0;

    console.log(
      `✅ FIFO: Procesamiento completado - Costo promedio ponderado: ${costoUnitarioPromedioPonderado.toFixed(4)}, Lotes afectados: ${lotesAfectados.length}`
    );

    return {
      costoUnitario: parseFloat(costoUnitarioPromedioPonderado.toFixed(4)),
      lotes: lotesAfectados
    };
  }



  /**
   * Usar costo promedio existente para salidas
   * No recalcula el promedio, usa el último calculado
   */
  private async usarPromedioExistente(
    inventarioId: number,
    cantidad: number
  ): Promise<{
    costoUnitario: number;
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    console.log(
      `🔄 Usando costo promedio existente para salida: Inventario=${inventarioId}, Cantidad=${cantidad}`
    );

    // Obtener el inventario para acceder al costo promedio actual
    const inventario = await this.inventarioRepository.findOne({
      where: { id: inventarioId }
    });

    if (!inventario) {
      throw new Error(`Inventario no encontrado: ${inventarioId}`);
    }

    const costoPromedioActual = Number(inventario.costoPromedioActual) || 0;
    console.log(`💰 Costo promedio actual del inventario: ${costoPromedioActual}`);

    // Obtener lotes disponibles para distribución física (FIFO)
    const lotesDisponibles = await this.loteRepository.find({
      where: { 
        inventario: { id: inventarioId },
        cantidadActual: MoreThan(0)
      },
      order: { fechaIngreso: 'ASC' }
    });

    if (lotesDisponibles.length === 0) {
      throw new Error(
        `No hay lotes disponibles para la venta. Inventario: ${inventarioId}`
      );
    }

    // Verificar stock suficiente
    const stockTotal = lotesDisponibles.reduce(
      (total, lote) => total + Number(lote.cantidadActual), 0
    );

    if (stockTotal < cantidad) {
      throw new Error(
        `Stock insuficiente. Disponible: ${stockTotal}, Requerido: ${cantidad}`
      );
    }

    // Distribuir cantidad usando FIFO pero con costo promedio existente
    let cantidadPendiente = cantidad;
    let lotesAfectados: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[] = [];

    console.log(`🎯 Distribuyendo ${cantidad} unidades con costo promedio fijo: ${costoPromedioActual}`);

    for (const lote of lotesDisponibles) {
      if (cantidadPendiente <= 0) break;

      const cantidadLote = Number(lote.cantidadActual);
      const cantidadADescontar = Math.min(cantidadLote, cantidadPendiente);

      if (cantidadADescontar > 0) {
        // Actualizar el lote físicamente
        lote.cantidadActual = cantidadLote - cantidadADescontar;
        cantidadPendiente -= cantidadADescontar;

        // Registrar lote afectado usando el costo promedio existente
        lotesAfectados.push({
          idLote: lote.id,
          costoUnitarioDeLote: costoPromedioActual, // Usar costo promedio fijo
          cantidad: cantidadADescontar
        });

        await this.loteRepository.save(lote);
        console.log(
          `📦 Lote ${lote.id} actualizado: Consumido=${cantidadADescontar}, Restante=${lote.cantidadActual}, Costo aplicado=${costoPromedioActual}`
        );
      }
    }

    if (cantidadPendiente > 0) {
      throw new Error(
        `No se pudo distribuir toda la cantidad. Pendiente: ${cantidadPendiente}`
      );
    }

    console.log(`✅ Salida procesada con costo promedio fijo: ${costoPromedioActual}`);
    console.log(`📊 Lotes afectados: ${lotesAfectados.length}`);

    return {
      costoUnitario: costoPromedioActual,
      lotes: lotesAfectados
    };
  }

  /**
   * Actualizar lotes usando promedio ponderado (MÉTODO OBSOLETO)
   * Mantenido para compatibilidad, pero ahora usa usarPromedioExistente
   */
  private async actualizarLotesPromedio(
    inventarioId: number,
    cantidad: number,
  ): Promise<{
    costoUnitario: number;
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    console.log(
      `🔄 MÉTODO OBSOLETO: Redirigiendo a usarPromedioExistente para mantener compatibilidad`,
    );
    
    // Redirigir al nuevo método que usa el costo promedio existente
    return await this.usarPromedioExistente(inventarioId, cantidad);
  }

  /**
   * Validar que los lotes se crearon correctamente para una compra
   */
  async validarLotesCompra(detalles: ComprobanteDetalle[]): Promise<boolean> {
    console.log(`🔍 Validando lotes creados para ${detalles.length} detalles`);

    try {
      for (const detalle of detalles) {
        const inventarioId = detalle.inventario.id;
        const cantidad = Number(detalle.cantidad);
        const precioUnitario = Number(detalle.precioUnitario);

        // Buscar el lote más reciente para este inventario por ID (más confiable que fecha)
        const lote = await this.loteRepository.findOne({
          where: { inventario: { id: inventarioId } },
          order: { id: 'DESC' },
        });

        if (!lote) {
          console.error(
            `❌ No se encontró lote para el inventario ${inventarioId}`,
          );
          return false;
        }

        // Validar que el lote tenga los datos correctos usando comparación con tolerancia para decimales
        const cantidadLote = Number(lote.cantidadInicial);
        const precioLote = Number(lote.costoUnitario);

        // Usar tolerancia de 0.01 para comparaciones decimales
        const tolerancia = 0.01;

        if (Math.abs(cantidadLote - cantidad) > tolerancia) {
          console.error(
            `❌ Cantidad incorrecta en lote ${lote.id}: Esperada=${cantidad}, Actual=${cantidadLote}`,
          );
          return false;
        }

        if (Math.abs(precioLote - precioUnitario) > tolerancia) {
          console.error(
            `❌ Precio unitario incorrecto en lote ${lote.id}: Esperado=${precioUnitario}, Actual=${precioLote}`,
          );
          return false;
        }

        console.log(
          `✅ Lote ${lote.id} validado correctamente para inventario ${inventarioId} (Cantidad: ${cantidadLote}, Precio: ${precioLote})`,
        );
      }

      console.log(`✅ Todos los lotes validados correctamente`);
      return true;
    } catch (error) {
      console.error(`❌ Error en validación de lotes:`, error.message);
      return false;
    }
  }

  /**
   * Obtener lotes recientes (últimos 10)
   */
  async findLotesRecientes(): Promise<InventarioLote[]> {
    return this.loteRepository.find({
      relations: ['inventario', 'inventario.producto', 'inventario.almacen'],
      order: { fechaIngreso: 'DESC' },
      take: 10,
    });
  }

  /**
   * Obtener lotes por inventario
   */
  async findLotesByInventario(idInventario: number): Promise<InventarioLote[]> {
    return this.loteRepository.find({
      where: { inventario: { id: idInventario } },
      relations: ['inventario', 'inventario.producto', 'inventario.almacen'],
      order: { fechaIngreso: 'ASC' },
    });
  }

  /**
   * Obtener lote por ID
   */
  async findLoteById(id: number): Promise<InventarioLote | null> {
    return this.loteRepository.findOne({
      where: { id },
      relations: ['inventario', 'inventario.producto', 'inventario.almacen'],
    });
  }

  /**
   * Obtener lotes con stock disponible
   */
  async findLotesDisponibles(idInventario: number): Promise<InventarioLote[]> {
    return this.loteRepository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.inventario', 'inventario')
      .leftJoinAndSelect('inventario.producto', 'producto')
      .leftJoinAndSelect('inventario.almacen', 'almacen')
      .where('lote.inventario.id = :idInventario', { idInventario })
      .andWhere('lote.cantidadActual > 0')
      .orderBy('lote.fechaIngreso', 'ASC')
      .getMany();
  }
}
