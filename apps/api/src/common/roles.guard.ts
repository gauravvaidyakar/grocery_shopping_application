import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@prisma/client";
import type { Request } from "express";
import { ROLES_KEY } from "./roles.decorator";
import type { RequestUser } from "./request-user";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>().user;
    return Boolean(user && required.includes(user.role));
  }
}
