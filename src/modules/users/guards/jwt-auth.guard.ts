import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
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

    try {
      const token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException('Token no encontrado');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userService.findByIdWithPersona(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      request['user'] = {
        id: user.id,
        email: user.email,
        roles: payload.roles,
        permissions: payload.permissions,
        persona: user.persona,
        personaId: user.persona?.id,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
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
