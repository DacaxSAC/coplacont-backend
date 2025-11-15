import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';
import { RolEnum } from '../modules/users/enums/RoleEnum';
import { Tabla } from '../modules/comprobantes/entities/tabla.entity';
import { TablaDetalle } from '../modules/comprobantes/entities/tabla-detalle.entity';
import { hash } from 'bcrypt';

/**
 * Servicio para inicializar datos por defecto en la base de datos
 * Se ejecuta al iniciar la aplicación
 */
@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Tabla)
    private readonly tablaRepository: Repository<Tabla>,
    @InjectRepository(TablaDetalle)
    private readonly tablaDetalleRepository: Repository<TablaDetalle>,
  ) {}

  /**
   * Se ejecuta cuando el módulo se inicializa
   */
  async onModuleInit() {
    await this.seedRoles();
    await this.seedAdminUser();
    await this.seedTablas();
  }

  /**
   * Crea los roles por defecto si no existen
   */
  private async seedRoles() {
    try {
      // Verificar si ya existen roles
      const existingRoles = await this.roleRepository.count();

      if (existingRoles === 0) {
        this.logger.log('Creando roles por defecto...');

        // Crear rol ADMIN
        const adminRole = this.roleRepository.create({
          nombre: RolEnum.ADMIN,
        });
        await this.roleRepository.save(adminRole);

        // Crear rol EMPRESA
        const empresaRole = this.roleRepository.create({
          nombre: RolEnum.EMPRESA,
        });
        await this.roleRepository.save(empresaRole);

        this.logger.log('Roles creados exitosamente: ADMIN, EMPRESA');
      } else {
        this.logger.log('Los roles ya existen en la base de datos');
      }
    } catch (error) {
      const msg =
        (error as Error)?.message || 'Error al crear roles por defecto';
      this.logger.error('Error al crear roles por defecto:', msg);
    }
  }

  /**
   * Crea el usuario administrador por defecto si no existe
   */
  private async seedAdminUser() {
    try {
      // Verificar si ya existe un usuario admin
      const existingAdmin = await this.userRepository.findOne({
        where: { email: 'admin@coplacont.com' },
      });

      if (!existingAdmin) {
        this.logger.log('Creando usuario administrador por defecto...');

        // Obtener el rol ADMIN
        const adminRole = await this.roleRepository.findOne({
          where: { nombre: RolEnum.ADMIN },
        });

        if (!adminRole) {
          this.logger.error(
            'No se encontró el rol ADMIN. Asegúrese de que los roles se hayan creado primero.',
          );
          return;
        }

        // Crear usuario admin
        const hashedPassword = await hash('admin123', 10);
        const adminUser = this.userRepository.create({
          nombre: 'Administrador',
          email: 'admin@coplacont.com',
          contrasena: hashedPassword,
          habilitado: true,
          esPrincipal: false,
        });

        const savedUser = await this.userRepository.save(adminUser);

        // Asignar rol ADMIN al usuario
        const userRole = this.userRoleRepository.create({
          user: savedUser,
          role: adminRole,
        });

        await this.userRoleRepository.save(userRole);

        this.logger.log('Usuario administrador creado exitosamente:');
        this.logger.log('Email: admin@coplacont.com');
        this.logger.log('Contraseña: admin123');
        this.logger.warn(
          '¡IMPORTANTE! Cambie la contraseña por defecto después del primer inicio de sesión.',
        );
      } else {
        this.logger.log(
          'El usuario administrador ya existe en la base de datos',
        );
      }
    } catch (error) {
      const msg =
        (error as Error)?.message ||
        'Error al crear usuario administrador por defecto';
      this.logger.error(
        'Error al crear usuario administrador por defecto:',
        msg,
      );
    }
  }

  /**
   * Crea las tablas maestras y sus detalles si no existen
   */
  private async seedTablas() {
    try {
      await this.seedTabla10();
      await this.seedTabla12();
    } catch (error) {
      const msg = (error as Error)?.message || 'Error al crear tablas maestras';
      this.logger.error('Error al crear tablas maestras:', msg);
    }
  }

  /**
   * Crea la Tabla 10 (Tipos de Comprobante) y sus detalles
   */
  private async seedTabla10() {
    try {
      // Verificar si ya existe la tabla 10
      let tabla10 = await this.tablaRepository.findOne({
        where: { numeroTabla: '10' },
        relations: ['detalles'],
      });

      if (!tabla10) {
        this.logger.log('Creando Tabla 10 (Tipos de Comprobante)...');

        // Crear la tabla 10
        tabla10 = this.tablaRepository.create({
          numeroTabla: '10',
          nombre: 'Tipos de Comprobante de Pago o Documento',
          descripcion: 'Catálogo de tipos de comprobantes de pago según SUNAT',
          activo: true,
        });
        tabla10 = await this.tablaRepository.save(tabla10);
      }

      // Upsert de detalles: crea los faltantes y actualiza descripciones si cambian
      const detallesTabla10 = [
        { codigo: '00', descripcion: 'Otros (especificar)' },
        { codigo: '01', descripcion: 'Factura' },
        { codigo: '02', descripcion: 'Recibo por Honorarios' },
        { codigo: '03', descripcion: 'Boleta de Venta' },
        { codigo: '04', descripcion: 'Liquidación de compra' },
        {
          codigo: '05',
          descripcion:
            'Boleto de compañía de aviación comercial por el servicio de transporte aéreo de pasajeros',
        },
        {
          codigo: '06',
          descripcion:
            'Carta de porte aéreo por el servicio de transporte de carga aérea',
        },
        { codigo: '07', descripcion: 'Nota de crédito' },
        { codigo: '08', descripcion: 'Nota de débito' },
        { codigo: '09', descripcion: 'Guía de remisión - Remitente' },
        { codigo: '10', descripcion: 'Recibo por Arrendamiento' },
        { codigo: '100', descripcion: 'Documento Interno' },
      ];

      for (const detalle of detallesTabla10) {
        const existente = await this.tablaDetalleRepository.findOne({
          where: {
            codigo: detalle.codigo,
            tabla: { idTabla: tabla10.idTabla },
          },
          relations: ['tabla'],
        });

        if (!existente) {
          const nuevo = this.tablaDetalleRepository.create({
            tabla: tabla10,
            codigo: detalle.codigo,
            descripcion: detalle.descripcion,
            activo: true,
          });
          await this.tablaDetalleRepository.save(nuevo);
          this.logger.log(
            `Detalle agregado a Tabla 10: ${detalle.codigo} - ${detalle.descripcion}`,
          );
        } else {
          // Actualizar descripción si cambió y asegurar que está activo
          const descCambio = existente.descripcion !== detalle.descripcion;
          const activoCambio = existente.activo !== true;
          if (descCambio || activoCambio) {
            existente.descripcion = detalle.descripcion;
            existente.activo = true;
            await this.tablaDetalleRepository.save(existente);
            this.logger.log(
              `Detalle actualizado en Tabla 10: ${detalle.codigo} - ${detalle.descripcion}`,
            );
          }
        }
      }

      this.logger.log('Tabla 10 verificada y detalles sincronizados');
    } catch (error) {
      this.logger.error('Error al crear Tabla 10:', error.message);
    }
  }

  /**
   * Crea la Tabla 12 (Tipos de Operación) y sus detalles
   */
  private async seedTabla12() {
    try {
      // Verificar si ya existe la tabla 12
      let tabla12 = await this.tablaRepository.findOne({
        where: { numeroTabla: '12' },
        relations: ['detalles'],
      });

      if (!tabla12) {
        this.logger.log('Creando Tabla 12 (Tipos de Operación)...');

        // Crear la tabla 12
        tabla12 = this.tablaRepository.create({
          numeroTabla: '12',
          nombre: 'Tipos de Operación',
          descripcion: 'Catálogo de tipos de operaciones según SUNAT',
          activo: true,
        });
        tabla12 = await this.tablaRepository.save(tabla12);
      }

      // Verificar si ya existen detalles
      if (!tabla12.detalles || tabla12.detalles.length === 0) {
        this.logger.log('Creando detalles para Tabla 12...');

        const detallesTabla12 = [
          { codigo: '01', descripcion: 'VENTA' },
          { codigo: '02', descripcion: 'COMPRA' },
          { codigo: '03', descripcion: 'CONSIGNACIÓN RECIBIDA' },
          { codigo: '04', descripcion: 'CONSIGNACIÓN ENTREGADA' },
          { codigo: '05', descripcion: 'DEVOLUCIÓN RECIBIDA' },
          { codigo: '06', descripcion: 'DEVOLUCIÓN ENTREGADA' },
          { codigo: '07', descripcion: 'PROMOCIÓN' },
          { codigo: '08', descripcion: 'PREMIO' },
          { codigo: '09', descripcion: 'DONACIÓN' },
          { codigo: '10', descripcion: 'SALIDA A PRODUCCIÓN' },
          { codigo: '11', descripcion: 'TRANSFERENCIA ENTRE ALMACENES' },
          { codigo: '12', descripcion: 'RETIRO' },
          { codigo: '13', descripcion: 'MERMAS' },
          { codigo: '14', descripcion: 'DESMEDROS' },
          { codigo: '15', descripcion: 'DESTRUCCIÓN' },
          { codigo: '16', descripcion: 'SALDO INICIAL' },
          { codigo: '99', descripcion: 'OTROS (ESPECIFICAR)' },
          { codigo: '100', descripcion: 'DOCUMENTO INTERNO (INGRESO)' },
          { codigo: '101', descripcion: 'DOCUMENTO INTERNO (SALIDA)' },
        ];

        for (const detalle of detallesTabla12) {
          const tablaDetalle = this.tablaDetalleRepository.create({
            tabla: tabla12,
            codigo: detalle.codigo,
            descripcion: detalle.descripcion,
            activo: true,
          });
          await this.tablaDetalleRepository.save(tablaDetalle);
        }

        this.logger.log('Tabla 12 y sus detalles creados exitosamente');
      } else {
        this.logger.log(
          'La Tabla 12 y sus detalles ya existen en la base de datos',
        );
      }
    } catch (error) {
      this.logger.error('Error al crear Tabla 12:', error.message);
    }
  }
}
