import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { ComprobanteDetalle } from '../../comprobantes/entities/comprobante-detalle';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

@Injectable()
export class LoteService {
    constructor(
        @InjectRepository(InventarioLote)
        private readonly loteRepository: Repository<InventarioLote>,
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>
    ) {}

    /**
     * Procesar lotes según el tipo de operación del comprobante
     */
    async procesarLotesComprobante(
        detalles: ComprobanteDetalle[],
        tipoOperacion: TipoOperacion,
        metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO
    ): Promise<void> {
        console.log(detalles);
        console.log(`🔄 Iniciando procesamiento de lotes: Tipo=${tipoOperacion}, Método=${metodoValoracion}, Detalles=${detalles.length}`);
        
        try {
            for (let i = 0; i < detalles.length; i++) {
                const detalle = detalles[i];
                console.log(detalle);
                console.log(`📦 Procesando detalle ${i + 1}/${detalles.length}: Inventario=${detalle.inventario?.id}, Cantidad=${detalle.cantidad}`);
                
                if (tipoOperacion === TipoOperacion.COMPRA) {
                    await this.registrarLoteCompra(detalle);
                } else {
                    await this.actualizarStockVenta(detalle, metodoValoracion);
                }
            }
            
            console.log(`✅ Procesamiento de lotes completado exitosamente para ${detalles.length} detalles`);
        } catch (error) {
            console.error(`❌ Error en procesamiento de lotes:`, error.message);
            throw error;
        }
    }

    /**
     * Registrar nuevo lote para compras
     */
    private async registrarLoteCompra(detalle: ComprobanteDetalle): Promise<void> {
        console.log(`Iniciando creación de lote para detalle: Inventario=${detalle.inventario?.id}, Cantidad=${detalle.cantidad}`);
        
        // Validar que el detalle tenga inventario
        if (!detalle.inventario || !detalle.inventario.id) {
            throw new Error('El detalle debe tener un inventario válido');
        }

        const inventario = await this.inventarioRepository.findOne({
            where: { id: detalle.inventario.id },
            relations: ['producto', 'almacen']
        });
    
        if (!inventario) {
            throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
        }

        // Validar que el inventario tenga producto y almacén
        if (!inventario.producto) {
            throw new Error(`El inventario ${detalle.inventario.id} no tiene un producto asociado`);
        }
        if (!inventario.almacen) {
            throw new Error(`El inventario ${detalle.inventario.id} no tiene un almacén asociado`);
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
            observaciones: `Lote creado automáticamente desde compra - ${detalle.descripcion || 'Sin descripción'}`
        });
    
        await this.loteRepository.save(lote);
    
        // Actualizar stock del inventario
        const stockActual = Number(inventario.stockActual) || 0;
        inventario.stockActual = stockActual + cantidad;
        await this.inventarioRepository.save(inventario);

        console.log(`✅ Lote creado exitosamente: ID=${lote.id}, Inventario=${inventario.id}, Producto=${inventario.producto.id}, Almacén=${inventario.almacen.id}, Cantidad=${cantidad}, Stock actualizado=${inventario.stockActual}`);
    }

    /**
     * Actualizar stock para ventas (FIFO - First In, First Out o lote específico)
     */
    private async actualizarStockVenta(detalle: ComprobanteDetalle, metodoValoracion: MetodoValoracion = MetodoValoracion.FIFO): Promise<void> {
        console.log('----------------------------------------');
        console.log('----------------------------------------');
        console.log('SECCION DE ACTUALIZAR LOTES');
        console.log('----------------------------------------');
        console.log('----------------------------------------');

        //Buscamos el inventario que pertenece el detalle
        console.log(detalle.inventario.id);
        const inventario = await this.inventarioRepository.findOne({
            where: { id: detalle.inventario.id }
        });
    
        if (!inventario) {
            throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
        }
    
        const stockActualNum = Number(detalle.inventario.stockActual);
        console.log('Stock actual del inventario:',stockActualNum);
        const cantidadNum = Number(detalle.cantidad);
        console.log('Cantidad del detalle', cantidadNum);
    
        if (stockActualNum < cantidadNum) {
            throw new Error(
                `Stock insuficiente. Disponible: ${stockActualNum}, Requerido: ${cantidadNum}`
            );
        }
    
        // Si se especifica un lote específico, usar ese lote
        if (detalle.idLote) {
            await this.actualizarLoteEspecifico(detalle.idLote, cantidadNum, inventario);
        } else {
            // Usar método de valoración seleccionado
            switch (metodoValoracion) {
                case MetodoValoracion.FIFO:
                    await this.actualizarLotesFIFO(inventario.id, cantidadNum);
                    break;
                case MetodoValoracion.LIFO:
                    await this.actualizarLotesLIFO(inventario.id, cantidadNum);
                    break;
                case MetodoValoracion.PROMEDIO:
                    await this.actualizarLotesPromedio(inventario.id, cantidadNum);
                    break;
                default:
                    await this.actualizarLotesPromedio(inventario.id, cantidadNum);
            }
        }
    
        // Actualizar stock del inventario - Convertir a números
        inventario.stockActual = stockActualNum - cantidadNum;
        await this.inventarioRepository.save(inventario);
    }

    /**
     * Actualizar un lote específico
     */
    private async actualizarLoteEspecifico(loteId: number, cantidad: number, inventario: Inventario): Promise<void> {
        const lote = await this.loteRepository.findOne({
            where: { id: loteId, inventario: { id: inventario.id } }
        });

        if (!lote) {
            throw new Error(`Lote no encontrado: ${loteId}`);
        }

        const cantidadActualNum = Number(lote.cantidadActual);
        if (cantidadActualNum < cantidad) {
            throw new Error(
                `Stock insuficiente en el lote ${loteId}. Disponible: ${cantidadActualNum}, Requerido: ${cantidad}`
            );
        }

        lote.cantidadActual = cantidadActualNum - cantidad;
        await this.loteRepository.save(lote);
    }

    /**
     * Actualizar lotes usando lógica FIFO
     */
    private async actualizarLotesFIFO(inventarioId: number, cantidad: number): Promise<void> {
        console.log(`🔍 FIFO: Buscando lotes para inventario ${inventarioId} con cantidad requerida ${cantidad}`);
        
        // Obtener lotes ordenados por fecha de ingreso (FIFO)
        const lotes = await this.loteRepository
            .createQueryBuilder('lote')
            .leftJoinAndSelect('lote.inventario', 'inventario')
            .where('inventario.id = :inventarioId', { inventarioId })
            .andWhere('lote.cantidadActual > 0')
            .orderBy('lote.fechaIngreso', 'ASC')
            .getMany();
    
        console.log(`📦 FIFO: Lotes encontrados: ${lotes.length}`);
        lotes.forEach((lote, index) => {
            console.log(`  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}, Fecha=${lote.fechaIngreso}`);
        });
        
        if (lotes.length === 0) {
            throw new Error(`FIFO: No hay lotes disponibles para la venta. Inventario: ${inventarioId}`);
        }
    
        let cantidadPendiente = cantidad;
        console.log(`🔄 FIFO: Iniciando descuento de ${cantidad} unidades`);
    
        for (const lote of lotes) {
            if (cantidadPendiente <= 0) break;
            if (Number(lote.cantidadActual) <= 0) continue;
    
            const cantidadADescontar = Math.min(Number(lote.cantidadActual), cantidadPendiente);
            
            console.log(`📦 FIFO: Lote ${lote.id}: Descontando ${cantidadADescontar} de ${lote.cantidadActual}`);
            
            lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
            cantidadPendiente -= cantidadADescontar;
    
            await this.loteRepository.save(lote);
            console.log(`✅ FIFO: Lote ${lote.id} actualizado: ${lote.cantidadActual}, Pendiente: ${cantidadPendiente}`);
        }
    
        if (cantidadPendiente > 0) {
            throw new Error(
                `FIFO: No hay suficientes lotes para cubrir la cantidad requerida. Faltante: ${cantidadPendiente}`
            );
        }
        
        console.log(`✅ FIFO: Descuento completado exitosamente`);
    }

    /**
     * Actualizar lotes usando lógica LIFO (Last In, First Out)
     */
    private async actualizarLotesLIFO(inventarioId: number, cantidad: number): Promise<void> {
        console.log(`🔍 LIFO: Buscando lotes para inventario ${inventarioId} con cantidad requerida ${cantidad}`);
        
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
            console.log(`  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}, Fecha=${lote.fechaIngreso}`);
        });
        
        if (lotes.length === 0) {
            throw new Error(`LIFO: No hay lotes disponibles para la venta. Inventario: ${inventarioId}`);
        }
    
        let cantidadPendiente = cantidad;
        console.log(`🔄 LIFO: Iniciando descuento de ${cantidad} unidades`);
    
        for (const lote of lotes) {
            if (cantidadPendiente <= 0) break;
            if (Number(lote.cantidadActual) <= 0) continue;
    
            const cantidadADescontar = Math.min(Number(lote.cantidadActual), cantidadPendiente);
            
            console.log(`📦 LIFO: Lote ${lote.id}: Descontando ${cantidadADescontar} de ${lote.cantidadActual}`);
            
            lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
            cantidadPendiente -= cantidadADescontar;
    
            await this.loteRepository.save(lote);
            console.log(`✅ LIFO: Lote ${lote.id} actualizado: ${lote.cantidadActual}, Pendiente: ${cantidadPendiente}`);
        }
    
        if (cantidadPendiente > 0) {
            throw new Error(
                `LIFO: No hay suficientes lotes para cubrir la cantidad requerida. Faltante: ${cantidadPendiente}`
            );
        }
        
        console.log(`✅ LIFO: Descuento completado exitosamente`);
    }

    /**
     * Actualizar lotes usando promedio ponderado
     */
    private async actualizarLotesPromedio(inventarioId: number, cantidad: number): Promise<void> {
        console.log('----------------------------------------');
        console.log('----------------------------------------');
        console.log('PROMEDIO - SELECCIÓN DE LOTES');
        console.log('----------------------------------------');
        console.log('----------------------------------------');

        console.log(`🔍 Buscando lotes para inventario ${inventarioId} con cantidad requerida ${cantidad}`);
        
        // Ejecutar debug para diagnosticar el problema
        //await this.debugLotes(inventarioId);
        
        // Obtener lotes de forma más simple
        const lotes = await this.loteRepository.find({
            where: { inventario: { id: inventarioId } },
            order: { fechaIngreso: 'ASC' }
        });
    
        console.log(`📦 Lotes encontrados: ${lotes.length}`);
        console.log(lotes);
        
        lotes.forEach((lote, index) => {
            console.log(`  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}`);
        });
        
        // Filtrar lotes con stock disponible
        const lotesDisponibles = lotes.filter(lote => Number(lote.cantidadActual) > 0);
        console.log(`✅ Lotes disponibles después de filtro: ${lotesDisponibles.length}`);
        
        if (lotesDisponibles.length === 0) {
            throw new Error(`No hay lotes disponibles para la venta. Inventario: ${inventarioId}, Lotes totales: ${lotes.length}`);
        }
    
        // Calcular totales para el promedio ponderado
        let cantidadTotal = 0;
        let valorTotal = 0;
    
        for (const lote of lotesDisponibles) {
            const cantidadLote = Number(lote.cantidadActual);
            const costoLote = Number(lote.costoUnitario);
            cantidadTotal += cantidadLote;
            valorTotal += cantidadLote * costoLote;
            console.log(`📊 Lote ${lote.id}: Cantidad=${cantidadLote}, Costo=${costoLote}, Subtotal=${cantidadLote * costoLote}`);
        }
        
        console.log(`📊 Totales: Cantidad=${cantidadTotal}, Valor=${valorTotal}, Promedio=${valorTotal / cantidadTotal}`);
    
        if (cantidadTotal < cantidad) {
            throw new Error(
                `Stock insuficiente. Disponible: ${cantidadTotal}, Requerido: ${cantidad}`
            );
        }
    
        // Distribuir proporcionalmente la cantidad a descontar
        let cantidadPendiente = cantidad;
        console.log(`🔄 Iniciando distribución de ${cantidad} unidades`);
    
        for (const lote of lotesDisponibles) {
            if (cantidadPendiente <= 0) break;
            
            const cantidadLote = Number(lote.cantidadActual);
            const proporcion = cantidadLote / cantidadTotal;
            const cantidadADescontar = Math.min(
                Math.round(cantidad * proporcion), 
                cantidadLote, 
                cantidadPendiente
            );
            
            console.log(`📦 Lote ${lote.id}: Proporción=${proporcion.toFixed(4)}, A descontar=${cantidadADescontar}`);
            
            if (cantidadADescontar > 0) {
                lote.cantidadActual = cantidadLote - cantidadADescontar;
                cantidadPendiente -= cantidadADescontar;
                await this.loteRepository.save(lote);
                console.log(`✅ Lote ${lote.id} actualizado: ${cantidadLote} -> ${lote.cantidadActual}`);
            }
        }
    
        // Si queda cantidad pendiente, descontarla de los primeros lotes disponibles
        if (cantidadPendiente > 0) {
            console.log(`⚠️ Cantidad pendiente: ${cantidadPendiente}, distribuyendo de lotes restantes`);
            for (const lote of lotesDisponibles) {
                if (cantidadPendiente <= 0) break;
                
                const cantidadDisponible = Number(lote.cantidadActual);
                if (cantidadDisponible > 0) {
                    const cantidadADescontar = Math.min(cantidadDisponible, cantidadPendiente);
                    lote.cantidadActual = cantidadDisponible - cantidadADescontar;
                    cantidadPendiente -= cantidadADescontar;
                    await this.loteRepository.save(lote);
                    console.log(`✅ Lote ${lote.id} ajustado: ${cantidadDisponible} -> ${lote.cantidadActual}`);
                }
            }
        }
        
        console.log(`✅ Distribución completada. Cantidad pendiente: ${cantidadPendiente}`);
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
                    order: { id: 'DESC' }
                });
                
                if (!lote) {
                    console.error(`❌ No se encontró lote para el inventario ${inventarioId}`);
                    return false;
                }
                
                // Validar que el lote tenga los datos correctos usando comparación con tolerancia para decimales
                const cantidadLote = Number(lote.cantidadInicial);
                const precioLote = Number(lote.costoUnitario);
                
                // Usar tolerancia de 0.01 para comparaciones decimales
                const tolerancia = 0.01;
                
                if (Math.abs(cantidadLote - cantidad) > tolerancia) {
                    console.error(`❌ Cantidad incorrecta en lote ${lote.id}: Esperada=${cantidad}, Actual=${cantidadLote}`);
                    return false;
                }
                
                if (Math.abs(precioLote - precioUnitario) > tolerancia) {
                    console.error(`❌ Precio unitario incorrecto en lote ${lote.id}: Esperado=${precioUnitario}, Actual=${precioLote}`);
                    return false;
                }
                
                console.log(`✅ Lote ${lote.id} validado correctamente para inventario ${inventarioId} (Cantidad: ${cantidadLote}, Precio: ${precioLote})`);
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
            take: 10
        });
    }

    /**
     * Obtener lotes por inventario
     */
    async findLotesByInventario(idInventario: number): Promise<InventarioLote[]> {
        return this.loteRepository.find({
            where: { inventario: { id: idInventario } },
            relations: ['inventario', 'inventario.producto', 'inventario.almacen'],
            order: { fechaIngreso: 'ASC' }
        });
    }

    /**
     * Obtener lote por ID
     */
    async findLoteById(id: number): Promise<InventarioLote | null> {
        return this.loteRepository.findOne({
            where: { id },
            relations: ['inventario', 'inventario.producto', 'inventario.almacen']
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

    /**
     * Crear lotes faltantes basándose en las compras existentes
     */
    async crearLotesFaltantes(inventarioId: number): Promise<void> {
        console.log(`🔧 Creando lotes faltantes para inventario ${inventarioId}`);
        
        try {
            // Obtener detalles de compra que no tienen lotes
            const detallesComprobante = await this.loteRepository.query(`
                SELECT cd.*, c."tipoOperacion", c."fechaEmision"
                FROM comprobante_detalle cd
                INNER JOIN comprobante c ON cd.id_comprobante = c."idComprobante"
                WHERE cd.id_inventario = $1 
                AND c."tipoOperacion" = 'COMPRA'
                ORDER BY c."fechaEmision" ASC
            `, [inventarioId]);
            
            console.log(`📊 Encontrados ${detallesComprobante.length} detalles de compra para crear lotes`);
            
            if (detallesComprobante.length === 0) {
                console.log(`⚠️ No hay detalles de compra para el inventario ${inventarioId}`);
                return;
            }
            
            // Obtener el inventario
            const inventario = await this.inventarioRepository.findOne({
                where: { id: inventarioId },
                relations: ['producto', 'almacen']
            });
            
            if (!inventario) {
                throw new Error(`Inventario ${inventarioId} no encontrado`);
            }
            
            // Crear lotes para cada detalle de compra
            for (const detalle of detallesComprobante) {
                const lote = this.loteRepository.create({
                    inventario: inventario,
                    numeroLote: `LOTE-${Date.now()}-${inventarioId}-${detalle.id_comprobante}`,
                    cantidadInicial: Number(detalle.cantidad),
                    cantidadActual: Number(detalle.cantidad),
                    costoUnitario: Number(detalle.precioUnitario),
                    fechaIngreso: new Date(detalle.fechaEmision),
                    observaciones: `Lote creado automáticamente desde compra ${detalle.id_comprobante} - ${detalle.descripcion || 'Sin descripción'}`
                });
                
                await this.loteRepository.save(lote);
                console.log(`✅ Lote creado: ID=${lote.id}, Cantidad=${lote.cantidadInicial}, Costo=${lote.costoUnitario}`);
            }
            
            console.log(`✅ Se crearon ${detallesComprobante.length} lotes para el inventario ${inventarioId}`);
            
        } catch (error) {
            console.error(`❌ Error al crear lotes faltantes:`, error.message);
            throw error;
        }
    }

    /**
     * Método de debug para verificar lotes en la base de datos
     */
    async debugLotes(inventarioId: number): Promise<void> {
        console.log(`🔍 DEBUG: Verificando lotes para inventario ${inventarioId}`);
        
        try {
            // Verificar si el inventario existe
            const inventario = await this.inventarioRepository.findOne({
                where: { id: inventarioId }
            });
            
            console.log(`📊 DEBUG: Inventario ${inventarioId} existe: ${!!inventario}`);
            if (inventario) {
                console.log(`  Inventario: ID=${inventario.id}, Stock=${inventario.stockActual}`);
            }
            
            // Intentar consulta directa a la tabla inventario_lote (sin JOINs problemáticos)
            const lotesDirectos = await this.loteRepository.query(`
                SELECT id, id_inventario, cantidadActual, costoUnitario, fechaIngreso
                FROM inventario_lote 
                WHERE id_inventario = $1 
                ORDER BY id DESC
            `, [inventarioId]);
            
            console.log(`📊 DEBUG: Lotes encontrados en inventario_lote: ${lotesDirectos.length}`);
            lotesDirectos.forEach((lote: any, index: number) => {
                console.log(`  Lote ${index + 1}: ID=${lote.id}, Inventario=${lote.id_inventario}, Cantidad=${lote.cantidad_actual}, Costo=${lote.costo_unitario}`);
            });
            
            // Intentar consulta con TypeORM (más simple)
            const lotesTypeORM = await this.loteRepository.find({
                where: { inventario: { id: inventarioId } }
            });
            
            console.log(`📊 DEBUG: Lotes encontrados con TypeORM: ${lotesTypeORM.length}`);
            lotesTypeORM.forEach((lote, index) => {
                console.log(`  Lote ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}`);
            });
            
            // Verificar si hay lotes con cantidad > 0
            const lotesConStock = lotesTypeORM.filter(lote => Number(lote.cantidadActual) > 0);
            console.log(`📊 DEBUG: Lotes con stock > 0: ${lotesConStock.length}`);
            lotesConStock.forEach((lote, index) => {
                console.log(`  Lote con stock ${index + 1}: ID=${lote.id}, Cantidad=${lote.cantidadActual}, Costo=${lote.costoUnitario}`);
            });
            
        } catch (error) {
            console.error(`❌ DEBUG: Error al verificar lotes:`, error.message);
        }
    }

    /**
     * Actualizar lotes usando promedio ponderado
     */
}