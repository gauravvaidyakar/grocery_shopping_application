import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ProductStatus,
  VendorStatus,
  VendorSuspensionReason,
  VerificationStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { VendorsService } from "../vendors/vendors.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}
  async dashboard() {
    const [
      customers,
      vendors,
      activeVendors,
      pendingVendors,
      products,
      pendingProducts,
      orders,
      vendorOrders,
      sales,
      commission,
      settlements,
      refunds,
      complaints,
      reviews,
      inventory,
    ] = await this.prisma.$transaction([
      this.prisma.customerProfile.count(),
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: VendorStatus.APPROVED } }),
      this.prisma.vendor.count({
        where: {
          status: {
            in: [
              VendorStatus.DOCUMENTS_SUBMITTED,
              VendorStatus.INSPECTION,
              VendorStatus.PENDING,
            ],
          },
        },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({
        where: { status: ProductStatus.PENDING_APPROVAL },
      }),
      this.prisma.masterOrder.count(),
      this.prisma.vendorOrder.count(),
      this.prisma.masterOrder.aggregate({ _sum: { payableTotal: true } }),
      this.prisma.commissionTransaction.aggregate({ _sum: { amount: true } }),
      this.prisma.settlement.aggregate({ _sum: { amount: true } }),
      this.prisma.refund.aggregate({ _sum: { amount: true } }),
      this.prisma.complaint.count(),
      this.prisma.review.count(),
      this.prisma.inventory.count(),
    ]);
    return {
      customers,
      vendors,
      activeVendors,
      pendingVendors,
      products,
      pendingProducts,
      orders,
      vendorOrders,
      sales: sales._sum.payableTotal ?? 0,
      commission: commission._sum.amount ?? 0,
      revenue: commission._sum.amount ?? 0,
      settlements: settlements._sum.amount ?? 0,
      refunds: refunds._sum.amount ?? 0,
      complaints,
      reviews,
      inventory,
    };
  }
  async listVendors(page: number, limit: number) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        include: {
          user: { select: { email: true, mobile: true, status: true } },
          _count: {
            select: { documents: true, products: true, vendorOrders: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendor.count(),
    ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async listCustomers(page: number, limit: number) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerProfile.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          marketingOptIn: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              mobile: true,
              status: true,
              emailVerifiedAt: true,
              mobileVerifiedAt: true,
              lastLoginAt: true,
            },
          },
          _count: { select: { addresses: true, orders: true, complaints: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerProfile.count(),
    ]);
    return {
      data: data.map((customer) => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.user.email,
        mobile: customer.user.mobile,
        status: customer.user.status,
        emailVerified: Boolean(customer.user.emailVerifiedAt),
        mobileVerified: Boolean(customer.user.mobileVerifiedAt),
        lastLoginAt: customer.user.lastLoginAt,
        orders: customer._count.orders,
        addresses: customer._count.addresses,
        complaints: customer._count.complaints,
        marketingOptIn: customer.marketingOptIn,
        createdAt: customer.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async vendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, mobile: true, status: true } },
        documents: true,
        bankAccounts: {
          select: {
            id: true,
            accountHolderName: true,
            accountNumberLast4: true,
            ifsc: true,
            bankName: true,
            status: true,
          },
        },
        inspections: {
          include: {
            inspector: { select: { email: true, mobile: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    return vendor;
  }
  async approveVendor(id: string, actorId: string) {
    const vendor = await this.vendor(id);
    if (vendor.status !== VendorStatus.PENDING) {
      throw new BadRequestException(
        "Vendor must complete document verification and inspection before approval",
      );
    }
    await this.vendors.assertApprovalReady(id);
    return this.vendors.transition(
      id,
      actorId,
      VendorStatus.APPROVED,
      "Vendor approved after KYC and inspection",
    );
  }
  async rejectVendor(id: string, actorId: string, reason: string) {
    if (!reason) throw new BadRequestException("Rejection reason is required");
    const vendor = await this.vendor(id);
    if (vendor.status === VendorStatus.APPROVED)
      throw new BadRequestException(
        "An approved vendor must be suspended, not rejected",
      );
    if (vendor.status === VendorStatus.SUSPENDED)
      throw new BadRequestException("Vendor is already suspended");
    return this.vendors.transition(id, actorId, VendorStatus.REJECTED, reason);
  }
  async suspendVendor(
    id: string,
    actorId: string,
    reason: VendorSuspensionReason,
    details?: string,
  ) {
    const vendor = await this.vendor(id);
    if (vendor.status !== VendorStatus.APPROVED)
      throw new BadRequestException("Only an approved vendor can be suspended");
    await this.vendors.transition(
      id,
      actorId,
      VendorStatus.SUSPENDED,
      `${reason}: ${details ?? ""}`.trim(),
    );
    return this.prisma.vendor.update({
      where: { id },
      data: {
        suspensionReason: reason,
        suspensionDetails: details,
        suspendedAt: new Date(),
      },
    });
  }
  async verifyBank(
    id: string,
    actorId: string,
    status: VerificationStatus,
    reason?: string,
  ) {
    if (status === VerificationStatus.PENDING)
      throw new BadRequestException(
        "Verification must be VERIFIED or REJECTED",
      );
    const account = await this.prisma.vendorBankAccount.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException("Bank account not found");
    const updated = await this.prisma.vendorBankAccount.update({
      where: { id },
      data: { status },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `VENDOR_BANK_${status}`,
        entityType: "VendorBankAccount",
        entityId: id,
        previousValue: { status: account.status },
        newValue: { status, reason },
      },
    });
    return updated;
  }
  async listProducts(page: number, limit: number) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        include: {
          vendor: { select: { id: true, businessName: true, status: true } },
          category: true,
          inventory: true,
          images: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count(),
    ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async approveProduct(id: string, actorId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    if (product.status !== ProductStatus.PENDING_APPROVAL)
      throw new BadRequestException("Product is not pending approval");
    if (product.vendor.status !== VendorStatus.APPROVED)
      throw new BadRequestException("Vendor must be approved");
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.APPROVED,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
    await this.audit(
      actorId,
      "PRODUCT_APPROVED",
      "Product",
      id,
      { status: product.status },
      { status: ProductStatus.APPROVED },
    );
    return updated;
  }
  async rejectProduct(id: string, actorId: string, reason: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, rejectionReason: reason },
    });
    await this.audit(
      actorId,
      "PRODUCT_REJECTED",
      "Product",
      id,
      { status: product.status },
      { status: ProductStatus.REJECTED, reason },
    );
    return updated;
  }
  async listOrders(page: number, limit: number) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.masterOrder.findMany({
        include: {
          vendorOrders: {
            include: {
              vendor: { select: { id: true, businessName: true } },
              items: true,
              shipment: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.masterOrder.count(),
    ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async order(id: string) {
    const order = await this.prisma.masterOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        vendorOrders: {
          include: { vendor: true, items: true, shipment: true },
        },
        payments: true,
        refunds: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
  payments(page: number, limit: number) {
    return this.page(this.prisma.payment, page, limit, {
      include: { masterOrder: { select: { orderNumber: true } }, refunds: true },
      orderBy: { createdAt: "desc" },
    });
  }
  shipments(page: number, limit: number) {
    return this.page(this.prisma.shipment, page, limit, {
      include: { vendorOrder: { include: { vendor: { select: { businessName: true } }, masterOrder: { select: { orderNumber: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }
  ledger(page: number, limit: number) {
    return this.page(this.prisma.vendorLedger, page, limit, {
      include: { vendor: { select: { businessName: true } }, vendorOrder: { select: { vendorOrderNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  replacements(page: number, limit: number) {
    return this.page(this.prisma.replacement, page, limit, {
      include: { orderItem: { include: { product: { include: { vendor: { select: { businessName: true } } } }, vendorOrder: { include: { masterOrder: { include: { customer: true } } } } } } },
      orderBy: { createdAt: "desc" },
    });
  }
  notifications(page: number, limit: number) {
    return this.page(this.prisma.notification, page, limit, { orderBy: { createdAt: "desc" } });
  }
  auditLogs(page: number, limit: number) {
    return this.page(this.prisma.auditLog, page, limit, {
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  async reports() {
    const [sales, commission, refunds, settlements] = await this.prisma.$transaction([
      this.prisma.masterOrder.aggregate({ _sum: { payableTotal: true }, _count: true }),
      this.prisma.commissionTransaction.aggregate({ _sum: { amount: true }, _count: true }),
      this.prisma.refund.aggregate({ _sum: { amount: true }, _count: true }),
      this.prisma.settlement.aggregate({ _sum: { amount: true }, _count: true }),
    ]);
    return { sales, commission, refunds, settlements };
  }
  private async page(model: { findMany(args: object): Promise<unknown[]>; count(): Promise<number> }, page: number, limit: number, options: Record<string, unknown>) {
    const [data, total] = await Promise.all([
      model.findMany({ ...options, skip: (page - 1) * limit, take: limit }),
      model.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  private audit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    previousValue: object,
    newValue: object,
  ) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entityType, entityId, previousValue, newValue },
    });
  }
}
