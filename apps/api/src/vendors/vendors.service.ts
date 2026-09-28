import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  ProductStatus,
  SettlementStatus,
  VendorDocumentType,
  VendorStatus,
  VerificationStatus,
} from "../database/domain.types";
import { FieldEncryptionService } from "../common/field-encryption.service";
import { MongoDatabaseService } from "../database/mongo-database.service";
import type {
  BankAccountDto,
  UpdateVendorContactDto,
  UpdateVendorDto,
} from "./vendors.dto";

const REQUIRED_DOCUMENTS: VendorDocumentType[] = [
  VendorDocumentType.PAN,
  VendorDocumentType.AADHAAR,
  VendorDocumentType.GST_CERTIFICATE,
  VendorDocumentType.FSSAI_LICENSE,
  VendorDocumentType.CANCELLED_CHEQUE,
  VendorDocumentType.BUSINESS_REGISTRATION_PROOF,
];

@Injectable()
export class VendorsService {
  constructor(
    private readonly database: MongoDatabaseService,
    private readonly encryption: FieldEncryptionService,
    private readonly config: ConfigService,
  ) {}

  async dashboard(userId: string) {
    const vendorId = await this.getVendorId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      totalProducts,
      activeProducts,
      pendingProducts,
      lowStockProducts,
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,
      reviewCount,
      complaintCount,
      sales,
      commission,
      netSettlement,
      pendingSettlement,
      settledAmount,
      recentOrders,
    ] = await Promise.all([
      this.database.product.count({ where: { vendorId } }),
      this.database.product.count({ where: { vendorId, status: ProductStatus.APPROVED } }),
      this.database.product.count({ where: { vendorId, status: ProductStatus.PENDING_APPROVAL } }),
      this.database.inventory.count({ where: { product: { vendorId }, quantity: { lte: 5 } } }),
      this.database.vendorOrder.count({ where: { vendorId } }),
      this.database.vendorOrder.count({ where: { vendorId, createdAt: { gte: today } } }),
      this.database.vendorOrder.count({ where: { vendorId, status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED] } } }),
      this.database.vendorOrder.count({ where: { vendorId, status: OrderStatus.DELIVERED } }),
      this.database.vendorOrder.count({ where: { vendorId, status: OrderStatus.CANCELLED } }),
      this.database.returnRequest.count({ where: { orderItem: { vendorOrder: { vendorId } } } }),
      this.database.review.count({ where: { product: { vendorId } } }),
      this.database.complaint.count({ where: { vendorId } }),
      this.database.vendorOrder.aggregate({ where: { vendorId, status: OrderStatus.DELIVERED }, _sum: { productSubtotal: true } }),
      this.database.commissionTransaction.aggregate({ where: { vendorId }, _sum: { amount: true } }),
      this.database.vendorOrder.aggregate({ where: { vendorId }, _sum: { settlementAmount: true } }),
      this.database.settlement.aggregate({ where: { vendorId, status: { in: [SettlementStatus.PENDING, SettlementStatus.ELIGIBLE, SettlementStatus.PROCESSING] } }, _sum: { amount: true } }),
      this.database.settlement.aggregate({ where: { vendorId, status: SettlementStatus.SETTLED }, _sum: { amount: true } }),
      this.database.vendorOrder.findMany({ where: { vendorId }, include: { items: true, shipment: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    return {
      totalProducts, activeProducts, pendingProducts, lowStockProducts,
      totalOrders, todayOrders, pendingOrders, deliveredOrders, cancelledOrders,
      returnRequests, reviewCount, complaintCount,
      totalSales: sales._sum.productSubtotal ?? 0,
      totalCommission: commission._sum.amount ?? 0,
      netSettlement: netSettlement._sum.settlementAmount ?? 0,
      pendingSettlement: pendingSettlement._sum.amount ?? 0,
      settledAmount: settledAmount._sum.amount ?? 0,
      recentOrders,
    };
  }

  async getByUser(userId: string) {
    const vendor = await this.database.vendor.findUnique({
      where: { userId },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            originalName: true,
            status: true,
            expiresAt: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
        bankAccounts: {
          select: {
            id: true,
            accountHolderName: true,
            accountNumberLast4: true,
            ifsc: true,
            bankName: true,
            status: true,
            isPrimary: true,
          },
        },
        inspections: true,
      },
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return vendor;
  }

  async getVendorId(userId: string): Promise<string> {
    return (await this.getByUser(userId)).id;
  }

  async update(userId: string, input: UpdateVendorDto) {
    const vendor = await this.getByUser(userId);
    if (
      vendor.status === VendorStatus.APPROVED ||
      vendor.status === VendorStatus.SUSPENDED
    )
      throw new ForbiddenException(
        "Approved or suspended vendor details require administrator review",
      );
    return this.database.vendor.update({
      where: { id: vendor.id },
      data: { ...input, businessAddress: input.businessAddress },
    });
  }

  async updateContact(userId: string, input: UpdateVendorContactDto) {
    const vendor = await this.getByUser(userId);
    const normalizeMobile = (value?: string | null) =>
      value?.replace(/^\+91/, "") ?? "";
    const mobileChanged =
      normalizeMobile(vendor.businessMobile) !==
      normalizeMobile(input.businessMobile);
    return this.database.transaction(async (tx: any) => {
      const updated = await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          businessEmail: input.businessEmail?.toLowerCase(),
          businessMobile: input.businessMobile,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          mobile: input.businessMobile,
          ...(mobileChanged ? { mobileVerifiedAt: null } : {}),
        },
      });
      return updated;
    });
  }

  async saveBankAccount(userId: string, input: BankAccountDto) {
    const vendorId = await this.getVendorId(userId);
    return this.database.vendorBankAccount.upsert({
      where: {
        id:
          (
            await this.database.vendorBankAccount.findFirst({
              where: { vendorId, isPrimary: true },
              select: { id: true },
            })
          )?.id ?? "00000000-0000-0000-0000-000000000000",
      },
      create: {
        vendorId,
        accountHolderName: input.accountHolderName,
        accountNumberEncrypted: this.encryption.encrypt(input.accountNumber),
        accountNumberLast4: input.accountNumber.slice(-4),
        ifsc: input.ifsc,
        bankName: input.bankName,
        branchName: input.branchName,
      },
      update: {
        accountHolderName: input.accountHolderName,
        accountNumberEncrypted: this.encryption.encrypt(input.accountNumber),
        accountNumberLast4: input.accountNumber.slice(-4),
        ifsc: input.ifsc,
        bankName: input.bankName,
        branchName: input.branchName,
        status: VerificationStatus.PENDING,
      },
      select: {
        id: true,
        accountHolderName: true,
        accountNumberLast4: true,
        ifsc: true,
        bankName: true,
        branchName: true,
        status: true,
      },
    });
  }

  async submitKyc(userId: string) {
    const vendor = await this.getByUser(userId);
    if (
      vendor.status !== VendorStatus.REGISTERED &&
      vendor.status !== VendorStatus.REJECTED
    ) {
      throw new BadRequestException(
        "KYC cannot be submitted in the current vendor state",
      );
    }
    const present = new Set(vendor.documents.map((document: any) => document.type));
    const missing = REQUIRED_DOCUMENTS.filter((type: any) => !present.has(type));
    if (missing.length > 0)
      throw new BadRequestException(
        `Missing required documents: ${missing.join(", ")}`,
      );
    if (vendor.bankAccounts.length === 0)
      throw new BadRequestException("Bank details are required");
    if (!vendor.panNumber || !vendor.gstin || !vendor.fssaiNumber)
      throw new BadRequestException(
        "PAN, GSTIN and FSSAI numbers are required",
      );
    return this.transition(
      vendor.id,
      userId,
      VendorStatus.DOCUMENTS_SUBMITTED,
      "KYC submitted",
    );
  }

  async transition(
    vendorId: string,
    actorId: string,
    toStatus: VendorStatus,
    reason: string,
  ) {
    const vendor = await this.database.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    return this.database.transaction(async (tx: any) => {
      const updated = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: toStatus,
          approvedAt:
            toStatus === VendorStatus.APPROVED ? new Date() : undefined,
          suspendedAt:
            toStatus === VendorStatus.SUSPENDED ? new Date() : undefined,
        },
      });
      await tx.vendorStatusHistory.create({
        data: {
          vendorId,
          fromStatus: vendor.status,
          toStatus,
          actorId,
          reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: `VENDOR_${toStatus}`,
          entityType: "Vendor",
          entityId: vendorId,
          previousValue: { status: vendor.status },
          newValue: { status: toStatus, reason },
        },
      });
      return updated;
    });
  }

  async assertApprovalReady(vendorId: string): Promise<void> {
    await this.assertKycVerified(vendorId);
    const vendor = await this.database.vendor.findUnique({
      where: { id: vendorId },
      include: { inspections: true },
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (
      !vendor.inspections.some(
        (item: any) =>
          item.status === "PASSED" &&
          item.documentsVerified &&
          item.premisesVerified &&
          item.qualityVerified,
      )
    )
      throw new BadRequestException("A passed physical inspection is required");
  }

  async assertKycVerified(vendorId: string): Promise<void> {
    const vendor = await this.database.vendor.findUnique({
      where: { id: vendorId },
      include: { documents: true, bankAccounts: true },
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    const verified = new Set(
      vendor.documents
        .filter((item: any) => item.status === VerificationStatus.VERIFIED)
        .map((item: any) => item.type),
    );
    const missing = REQUIRED_DOCUMENTS.filter((type: any) => !verified.has(type));
    if (missing.length > 0)
      throw new BadRequestException(
        `Unverified required documents: ${missing.join(", ")}`,
      );
    if (
      !vendor.bankAccounts.some(
        (item: any) => item.status === VerificationStatus.VERIFIED,
      )
    )
      throw new BadRequestException("A verified bank account is required");
  }

  settlementDays(): number {
    return this.config.get<number>("SETTLEMENT_DAYS", 7);
  }
}
