import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Interface para el usuario autenticado en el request
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  nombre: string;
  persona?: {
    id: number;
    nombreEmpresa: string;
    ruc: string;
    razonSocial?: string;
    telefono?: string;
    direccion?: string;
  };
  personaId: number | null;
  roles: any[];
  permissions: any[];
}

/**
 * Decorador para obtener el usuario autenticado del request
 * Debe usarse junto con el JwtAuthGuard
 *
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * findAll(@CurrentUser() user: AuthenticatedUser) {
 *   return this.service.findAll(user.personaId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request['user'] as AuthenticatedUser;

    if (!user) {
      throw new Error(
        'Usuario no encontrado en el request. Asegúrate de usar JwtAuthGuard.',
      );
    }

    return data ? user[data] : user;
  },
);
