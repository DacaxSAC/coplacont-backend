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
    console.log(
      `🔄 Iniciando procesamiento de lotes: Tipo=${tipoOperacion}, Método=${metodoValoracion}, Detalles=${detalles.length}`,
    );
    let costosUnitariosDeDetalles: number[] = [];
    let lotesUsados: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];

    try {
      for (let i = 0; i < detalles.length; i++) {
        const detalle = detalles[i];
        console.log(
          `📦 Procesando detalle de lote ${i + 1}/${detalles.length}: Inventario=${detalle.inventario?.id}, Cantidad=${detalle.cantidad}`,
        );
        console.log(detalle);

        if (tipoOperacion === TipoOperacion.COMPRA) {
          await this.registrarLoteCompra(detalle);
        } else {
          const {costoUnitario, lotes} = await this.actualizarStockVenta(
            detalle,
            metodoValoracion,
          );
          costosUnitariosDeDetalles.push(costoUnitario);
          console.log(
            `Costo unitario calculado: ${costoUnitario} de detalle ${i + 1}`,
            detalle,
          );
          lotesUsados.push(...lotes);
          console.log(
            `Lotes usados: ${lotesUsados} de detalle ${i + 1}`,
            detalle,
          );
        }
      }
      console.log(
        `✅ Procesamiento de lotes completado exitosamente para ${detalles.length} detalles`,
      );
    } catch (error) {
      console.error(`❌ Error en procesamiento de lotes:`, error.message);
      throw error;
    }
    return {costoUnitario: costosUnitariosDeDetalles, lotes: lotesUsados};
  }

  /**
   * Registrar nuevo lote para compras
   */
  private async registrarLoteCompra(
    detalle: ComprobanteDetalle,
  ): Promise<void> {
    console.log(
      `Iniciando creación de lote para detalle: Inventario=${detalle.inventario?.id}, Cantidad=${detalle.cantidad}`,
    );

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

    // Actualizar stock del inventario
    const stockActual = Number(inventario.stockActual) || 0;
    inventario.stockActual = stockActual + cantidad;
    await this.inventarioRepository.save(inventario);

    console.log(
      `✅ Lote creado exitosamente: ID=${lote.id}, Inventario=${inventario.id}, Producto=${inventario.producto.id}, Almacén=${inventario.almacen.id}, Cantidad=${cantidad}, Stock actualizado=${inventario.stockActual}`,
    );
  }

  /**
   * Actualizar stock para ventas (FIFO - First In, First Out o lote específico)
   */
  private async actualizarStockVenta(
    detalle: ComprobanteDetalle,
    metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO,
  ): Promise<{costoUnitario: number, lotes: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[]}> {
    console.log('----------------------------------------');
    console.log('----------------------------------------');
    console.log('SECCION DE ACTUALIZAR LOTES');
    console.log('----------------------------------------');
    console.log('----------------------------------------');

    //Buscamos el inventario que pertenece el detalle
    console.log('Inventario del detalle:', detalle.inventario);
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
        case MetodoValoracion.LIFO:
          await this.actualizarLotesLIFO(inventario.id, cantidadNum);
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
  private async actualizarLotesFIFO(
    inventarioId: number,
    cantidad: number,
  ): Promise<{
    costoUnitario: number;
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    let costoUnitarioPorAlgoritmoCosteoFIFO = 0;
    let precioYcantidadPorLote: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[] = [];

    // Obtener lotes ordenados por fecha de ingreso (FIFO)
    const lotes = await this.loteRepository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.inventario', 'inventario')
      .where('inventario.id = :inventarioId', { inventarioId })
      .andWhere('lote.cantidadActual > 0')
      .orderBy('lote.fechaIngreso', 'ASC')
      .getMany();

    console.log('----------------------------------------');
    console.log('Lotes encontrados:', lotes);

    if (lotes.length === 0) {
      throw new Error(
        `FIFO: No hay lotes disponibles para la venta. Inventario: ${inventarioId}`,
      );
    }

    let cantidadPendiente = cantidad;

    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;
      if (Number(lote.cantidadActual) <= 0) continue;

      const cantidadADescontar = Math.min(
        Number(lote.cantidadActual),
        cantidadPendiente,
      );

      lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
      cantidadPendiente -= cantidadADescontar;
      precioYcantidadPorLote.push({
        idLote: lote.id,
        costoUnitarioDeLote: lote.costoUnitario,
        cantidad: cantidadADescontar,
      });

      let costoPorCantidadDescontada = cantidadADescontar * lote.costoUnitario;
      costoUnitarioPorAlgoritmoCosteoFIFO += costoPorCantidadDescontada;

      await this.loteRepository.save(lote);
    }

    if (cantidadPendiente > 0) {
      throw new Error(
        `FIFO: No hay suficientes lotes para cubrir la cantidad requerida. Faltante: ${cantidadPendiente}`,
      );
    }

    return {
    costoUnitario: costoUnitarioPorAlgoritmoCosteoFIFO,
    lotes: precioYcantidadPorLote
    };
  }

  /**
   * Actualizar lotes usando lógica LIFO (Last In, First Out)
   */
  private async actualizarLotesLIFO(
    inventarioId: number,
    cantidad: number,
  ): Promise<void> {
    console.log(
      `🔍 LIFO: Buscando lotes para inventario ${inventarioId} con cantidad requerida ${cantidad}`,
    );

    // Obtener lotes ordenados por fecha de ingreso descendente (LIFO)
    const lotes = await this.loteRepository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.inventario', 'inventario')
      .where('inventario.id = :inventarioId', { inventarioId })
      .andWhere('lote.cantidadActual > 0')
      .orderBy('lote.fechaIngreso', 'DESC')
      .getMany();

    console.log(`📦 LIFO: Lotes encontrados: ${lotes.length}`);
    lotes.forEach((lote, index) => {
      console.log(
        `  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}, Fecha=${lote.fechaIngreso}`,
      );
    });

    if (lotes.length === 0) {
      throw new Error(
        `LIFO: No hay lotes disponibles para la venta. Inventario: ${inventarioId}`,
      );
    }

    let cantidadPendiente = cantidad;
    console.log(`🔄 LIFO: Iniciando descuento de ${cantidad} unidades`);

    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;
      if (Number(lote.cantidadActual) <= 0) continue;

      const cantidadADescontar = Math.min(
        Number(lote.cantidadActual),
        cantidadPendiente,
      );

      console.log(
        `📦 LIFO: Lote ${lote.id}: Descontando ${cantidadADescontar} de ${lote.cantidadActual}`,
      );

      lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
      cantidadPendiente -= cantidadADescontar;

      await this.loteRepository.save(lote);
      console.log(
        `✅ LIFO: Lote ${lote.id} actualizado: ${lote.cantidadActual}, Pendiente: ${cantidadPendiente}`,
      );
    }

    if (cantidadPendiente > 0) {
      throw new Error(
        `LIFO: No hay suficientes lotes para cubrir la cantidad requerida. Faltante: ${cantidadPendiente}`,
      );
    }

    console.log(`✅ LIFO: Descuento completado exitosamente`);
  }

  /**
   * Actualizar lotes usando promedio ponderado
   */
  private async actualizarLotesPromedio(
    inventarioId: number,
    cantidad: number,
  ): Promise<{
    costoUnitario: number;
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    console.log(
      `🔄 Iniciando actualización de lotes con método PROMEDIO: Inventario=${inventarioId}, Cantidad=${cantidad}`,
    );

    // Obtener lotes de forma más simple
    const lotes = await this.loteRepository.find({
      where: { inventario: { id: inventarioId } },
      order: { fechaIngreso: 'ASC' },
    });

    console.log(`📦 Lotes encontrados: ${lotes.length}`);
    console.log(lotes);

    lotes.forEach((lote, index) => {
      console.log(
        `  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}`,
      );
    });

    // Filtrar lotes con stock disponible
    const lotesDisponibles = lotes.filter(
      (lote) => Number(lote.cantidadActual) > 0,
    );
    console.log(
      `✅ Lotes disponibles después de filtro: ${lotesDisponibles.length}`,
    );

    if (lotesDisponibles.length === 0) {
      throw new Error(
        `No hay lotes disponibles para la venta. Inventario: ${inventarioId}, Lotes totales: ${lotes.length}`,
      );
    }

    // Calcular totales para el promedio ponderado
    let cantidadTotal = 0;
    let valorTotal = 0;

    console.log(`🔍 Calculando costo promedio ponderado:`);
    for (const lote of lotesDisponibles) {
      const cantidadLote = Number(lote.cantidadActual);
      const costoLote = Number(lote.costoUnitario);
      const subtotal = cantidadLote * costoLote;
      cantidadTotal += cantidadLote;
      valorTotal += subtotal;
      console.log(
        `📊 Lote ${lote.id}: Cantidad=${cantidadLote}, Costo=${costoLote}, Subtotal=${subtotal}`,
      );
    }

    const costoPromedioPonderado = cantidadTotal > 0 ? valorTotal / cantidadTotal : 0;
    console.log(
      `📊 Totales: Cantidad=${cantidadTotal}, Valor=${valorTotal}, Promedio=${costoPromedioPonderado}`,
    );
    console.log(`💰 Costo promedio ponderado calculado: ${costoPromedioPonderado}`);

    if (cantidadTotal < cantidad) {
      throw new Error(
        `Stock insuficiente. Disponible: ${cantidadTotal}, Requerido: ${cantidad}`,
      );
    }

    // Variables para el retorno
    let costoTotalConsumido = 0;
    let precioYcantidadPorLote: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[] = [];

    // Distribuir la cantidad usando FIFO pero con costo promedio ponderado
    let cantidadPendiente = cantidad;
    console.log(`🎯 Iniciando distribución FIFO con costo promedio: ${costoPromedioPonderado}`);
    console.log(`🔄 Iniciando distribución FIFO de ${cantidad} unidades con costo promedio ${costoPromedioPonderado}`);

    for (const lote of lotesDisponibles) {
      if (cantidadPendiente <= 0) break;

      const cantidadLote = Number(lote.cantidadActual);
      const cantidadADescontar = Math.min(cantidadLote, cantidadPendiente);

      console.log(
        `🔄 Procesando lote ${lote.id}: Cantidad disponible=${cantidadLote}, A consumir=${cantidadADescontar}`,
      );
      console.log(
        `📦 Lote ${lote.id}: Disponible=${cantidadLote}, A descontar=${cantidadADescontar}`,
      );

      if (cantidadADescontar > 0) {
        // Actualizar el lote
        lote.cantidadActual = cantidadLote - cantidadADescontar;
        cantidadPendiente -= cantidadADescontar;
        
        // Registrar lote afectado para el retorno (usando costo promedio ponderado)
        precioYcantidadPorLote.push({
          idLote: lote.id,
          costoUnitarioDeLote: costoPromedioPonderado, // Usar costo promedio ponderado
          cantidad: cantidadADescontar,
        });
        
        // Calcular costo total usando el costo promedio ponderado
        costoTotalConsumido += cantidadADescontar * costoPromedioPonderado;
        
        await this.loteRepository.save(lote);
        console.log(
          `📦 Lote ${lote.id} actualizado: Consumido=${cantidadADescontar}, Restante en lote=${lote.cantidadActual}, Costo total acumulado=${costoTotalConsumido}`,
        );
        console.log(
          `✅ Lote ${lote.id} actualizado: ${cantidadLote} -> ${lote.cantidadActual}`,
        );
      }
    }

    console.log(
      `✅ Distribución completada. Cantidad pendiente: ${cantidadPendiente}`,
    );
    
    if (cantidadPendiente > 0) {
      throw new Error(
        `No se pudo distribuir toda la cantidad. Pendiente: ${cantidadPendiente}`,
      );
    }
    
    // El costo unitario final es el costo promedio ponderado
    const costoUnitarioFinal = costoPromedioPonderado;
    
    console.log(`💰 Resumen final PROMEDIO:`);
    console.log(`  - Costo unitario final: ${costoUnitarioFinal}`);
    console.log(`  - Costo total consumido: ${costoTotalConsumido}`);
    console.log(`  - Cantidad total procesada: ${cantidad}`);
    console.log(`  - Lotes afectados: ${precioYcantidadPorLote.length}`);
    console.log(`  - Detalle de lotes:`, precioYcantidadPorLote);
    
    return {
      costoUnitario: costoUnitarioFinal,
      lotes: precioYcantidadPorLote,
    };
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
