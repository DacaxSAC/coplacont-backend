import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';
import { RolEnum } from '../modules/users/enums/RoleEnum';
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
  ) {}

  /**
   * Se ejecuta cuando el módulo se inicializa
   */
  async onModuleInit() {
    await this.seedRoles();
    await this.seedAdminUser();
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
      this.logger.error('Error al crear roles por defecto:', error.message);
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
      this.logger.error(
        'Error al crear usuario administrador por defecto:',
        error.message,
      );
    }
  }
}
