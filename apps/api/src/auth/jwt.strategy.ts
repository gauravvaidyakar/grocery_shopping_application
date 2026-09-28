import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus, type Role } from "../database/domain.types";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { RequestUser } from "../common/request-user";
import { MongoDatabaseService } from "../database/mongo-database.service";

interface JwtPayload {
  sub: string;
  role: Role;
  type: "access";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly database: MongoDatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type !== "access")
      throw new UnauthorizedException("Invalid access token");
    const user = await this.database.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, email: true, mobile: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("Account is not active");
    return {
      id: user.id,
      role: user.role,
      ...(user.email ? { email: user.email } : {}),
      ...(user.mobile ? { mobile: user.mobile } : {}),
    };
  }
}
