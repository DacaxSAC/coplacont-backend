import { Injectable, UnauthorizedException } from "@nestjs/common";
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

  async validateUser(email: string, contrasena: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(contrasena, user.contrasena)) {
      return user;
    }
    throw new UnauthorizedException('Credenciales inválidas');
  }

  async login(authLoginDto : AuthLoginDto) {
    const user = await this.validateUser(authLoginDto.email, authLoginDto.contrasena);
    const roles = await this.userRoleService.findRolesByUser(user);
    const permissions = await this.rolePermissionService.findPermissionsByRoles(roles);
    const payload = this.jwtService.sign(this.buildPayload(user,roles,permissions))
    return this.buildAuthResponse(user.email , payload)
  }

  private buildPayload (user : User , roles : Role[] , permissions : Permission[]): Payload {
    return {
        sub: user.id,
        email: user.email,
        roles,
        permissions
    }
  }

  private buildAuthResponse (email : string , jwt : string) : AuthResponseDto {
    return {
        email,
        jwt
    }
  }

}
