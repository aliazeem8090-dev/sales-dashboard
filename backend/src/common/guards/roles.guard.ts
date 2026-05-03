import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    const userRole = String(user.role || '').toLowerCase();
    const normalizedRequiredRoles = requiredRoles.map((role) => role.toLowerCase());

    if (!normalizedRequiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Requires role: ${requiredRoles.join(' or ')}`);
    }
    return true;
  }
}
