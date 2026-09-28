import { Injectable, NotFoundException } from "@nestjs/common";
import { MongoDatabaseService } from "../database/mongo-database.service";
import type { UpdateCustomerDto } from "./customers.dto";
@Injectable()
export class CustomersService {
  constructor(private readonly database: MongoDatabaseService) {}
  async profile(userId: string) {
    const profile = await this.database.customerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, mobile: true, mobileVerifiedAt: true, createdAt: true } },
      },
    });
    if (!profile) throw new NotFoundException("Customer profile not found");
    return {
      id: profile.id,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      email: profile.user.email,
      mobile: profile.user.mobile,
      mobileVerified: Boolean(profile.user.mobileVerifiedAt),
      role: "CUSTOMER",
      createdAt: profile.user.createdAt,
      marketingOptIn: profile.marketingOptIn,
    };
  }
  async update(userId: string, input: UpdateCustomerDto) {
    const current = await this.database.customerProfile.findUnique({
      where: { userId },
      include: { user: { select: { mobile: true } } },
    });
    if (!current) throw new NotFoundException("Customer profile not found");
    const names = input.name?.trim().split(/\s+/);
    const normalizedMobile = (value?: string | null) => value?.replace(/^\+91/, "") ?? "";
    const mobileChanged =
      input.mobile !== undefined &&
      normalizedMobile(input.mobile) !== normalizedMobile(current.user.mobile);
    await this.database.transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: input.email?.toLowerCase(),
          mobile: input.mobile,
          ...(mobileChanged ? { mobileVerifiedAt: null } : {}),
        },
      });
      await tx.customerProfile.update({
        where: { userId },
        data: {
          firstName: names?.[0],
          lastName: names?.slice(1).join(" ") || undefined,
          marketingOptIn: input.marketingOptIn,
        },
      });
    });
    return this.profile(userId);
  }
}
