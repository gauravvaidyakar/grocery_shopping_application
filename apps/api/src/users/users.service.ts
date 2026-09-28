import { Injectable, NotFoundException } from "@nestjs/common";
import { MongoDatabaseService } from "../database/mongo-database.service";
@Injectable()
export class UsersService {
  constructor(private readonly database: MongoDatabaseService) {}
  async safeById(id: string) {
    const user = await this.database.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
