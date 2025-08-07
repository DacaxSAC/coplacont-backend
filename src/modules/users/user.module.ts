import { Module } from '@nestjs/common';
import { UserController } from './controller/user.controller';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolController } from './controller/role.controller';
import { RoleService } from './services/role.service';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleController } from './controller/user-role.controller';
import { UserRolService } from './services/user-role.service';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './services/permission.service';
import { PermissionController } from './controller/permission.controller';
import { RolePermissionController } from './controller/role-permission.controller';
import { RolePermissionService } from './services/role-permission.service';
import { RolePermission } from './entities/role-permission.entity';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
      TypeOrmModule.forFeature([User, Role, UserRole, Permission, RolePermission]),
      JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '1h' },
        }),
      }),
    ],
    controllers: [
      UserController,
      RolController,
      UserRoleController,
      PermissionController,
      RolePermissionController,
      AuthController,
    ],
    providers: [
      UserService,
      RoleService,
      UserRolService,
      PermissionService,
      RolePermissionService,
      AuthService,
    ],
  })
  export class UserModule {}