import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from '../services/user.service';
import { Payload } from '../dto/auth/payload';

/**
 * Guard para validar tokens JWT y obtener información del usuario autenticado
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    try {
      const payload: Payload = await this.jwtService.verifyAsync(token);
      
      // Obtener el usuario completo con su persona
      const user = await this.userService.findByIdWithPersona(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Agregar información del usuario al request
      request['user'] = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        persona: user.persona,
        personaId: user.persona?.id || null,
        roles: payload.roles,
        permissions: payload.permissions
      };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Extrae el token JWT del header Authorization
   * @param request Request object
   * @returns Token JWT o undefined
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}