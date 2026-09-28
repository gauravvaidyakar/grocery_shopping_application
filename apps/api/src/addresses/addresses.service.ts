import { Injectable, NotFoundException } from "@nestjs/common";
import { MongoDatabaseService } from "../database/mongo-database.service";
import type { AddressDto } from "./addresses.dto";
@Injectable()
export class AddressesService {
  constructor(private readonly database: MongoDatabaseService) {}
  private async customerId(userId: string) {
    const customer = await this.database.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer.id;
  }
  async list(userId: string) {
    return this.database.address.findMany({
      where: { customerId: await this.customerId(userId) },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }
  async create(userId: string, input: AddressDto) {
    const customerId = await this.customerId(userId);
    return this.database.transaction(async (tx: any) => {
      if (input.isDefault)
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      return tx.address.create({ data: { ...input, customerId } });
    });
  }
  async update(userId: string, id: string, input: AddressDto) {
    const customerId = await this.customerId(userId);
    const exists = await this.database.address.findFirst({
      where: { id, customerId },
    });
    if (!exists) throw new NotFoundException("Address not found");
    return this.database.transaction(async (tx: any) => {
      if (input.isDefault)
        await tx.address.updateMany({
          where: { customerId, id: { not: id } },
          data: { isDefault: false },
        });
      return tx.address.update({ where: { id }, data: input });
    });
  }
  async remove(userId: string, id: string) {
    const customerId = await this.customerId(userId);
    const result = await this.database.address.deleteMany({
      where: { id, customerId },
    });
    if (!result.count) throw new NotFoundException("Address not found");
  }
}
