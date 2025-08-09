import { Injectable } from "@nestjs/common";
import { UserService } from "./user.service";
import * as bcrypt from 'bcrypt';
import { User } from "../entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { AuthLoginDto } from "../dto/auth/auth-login.dto";
import { UserRolService } from "./user-role.service";
import { RolePermissionService } from "./role-permission.service";
import { Role } from "../entities/role.entity";
import { Permission } from "../entities/permission.entity";
import { Payload } from "../dto/auth/payload";
import { AuthResponseDto } from "../dto/auth/auth-response.dto";

@Injectable()
export class AuthService {

  constructor(
    private readonly usersService: UserService,
    private readonly userRoleService : UserRolService,
    private readonly rolePermissionService : RolePermissionService,
    private readonly jwtService: JwtService,
  ) {
  }

  /**
   * Valida las credenciales del usuario
   * @param email Email del usuario
   * @param contrasena Contraseña del usuario
   * @returns Usuario si las credenciales son válidas, null si son inválidas
   */
  async validateUser(email: string, contrasena: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(contrasena, user.contrasena)) {
      return user;
    }
    return null;
  }

  /**
   * Procesa el login del usuario
   * @param authLoginDto Datos de login (email y contraseña)
   * @returns Respuesta de autenticación con mensaje, email y JWT (si es exitoso)
   */
  async login(authLoginDto : AuthLoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(authLoginDto.email, authLoginDto.contrasena);

    if (!user) {
      return this.buildAuthResponse('Credenciales inválidas', false);
    }
    
    const roles = await this.userRoleService.findRolesByUser(user);
    const permissions = await this.rolePermissionService.findPermissionsByRoles(roles);
    const payload = this.jwtService.sign(this.buildPayload(user,roles,permissions))
    return this.buildAuthResponse('Inicio de sesión exitoso', true, user.email, payload)
  }

  private buildPayload (user : User , roles : Role[] , permissions : Permission[]): Payload {
    return {
        sub: user.id,
        email: user.email,
        roles,
        permissions
    }
  }

  /**
   * Construye la respuesta de autenticación
   * @param message Mensaje de respuesta
   * @param email Email del usuario (opcional)
   * @param jwt Token JWT (opcional)
   * @returns Objeto de respuesta de autenticación
   */
  private buildAuthResponse (message: string, success: boolean, email?: string, jwt?: string) : AuthResponseDto {
    const response: AuthResponseDto = { message, success };
    
    if (email) response.email = email;
    if (jwt) response.jwt = jwt;
    
    return response;
  }

}
