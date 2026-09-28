import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundMethod,
  ReturnResolution,
  ReturnStatus,
} from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { VendorsService } from "../vendors/vendors.service";
import type { CreateReturnDto } from "./returns.dto";

const EVIDENCE_MIME = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);
@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly vendors: VendorsService,
    private readonly notifications: NotificationsService,
  ) {}
  async create(
    userId: string,
    orderId: string,
    itemId: string,
    input: CreateReturnDto,
    files: Express.Multer.File[] = [],
  ) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        vendorOrder: { masterOrder: { id: orderId, customer: { userId } } },
      },
      include: { vendorOrder: true },
    });
    if (!item) throw new NotFoundException("Order item not found");
    if (item.status !== OrderStatus.DELIVERED || !item.vendorOrder.deliveredAt)
      throw new BadRequestException("Only delivered items can be returned");
    const deadline = new Date(item.vendorOrder.deliveredAt);
    deadline.setUTCDate(
      deadline.getUTCDate() + this.config.get<number>("RETURN_WINDOW_DAYS", 7),
    );
    if (new Date() > deadline)
      throw new BadRequestException("Return window has expired");
    const customer = await this.prisma.customerProfile.findUniqueOrThrow({
      where: { userId },
    });
    const evidence = await this.storeEvidence(customer.id, files);
    const request = await this.prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.create({
        data: {
          orderItemId: item.id,
          customerId: customer.id,
          reason: input.reason,
          resolution: input.resolution,
          evidence: [...(input.evidenceUrls ?? []), ...evidence],
        },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: OrderStatus.RETURN_REQUESTED, cancellable: false },
      });
      return request;
    });
    await this.notifications
      .notifyReturnStatus(request.id, request.status)
      .catch(() => undefined);
    return this.presentReturn(request);
  }

  private async storeEvidence(
    customerId: string,
    files: Express.Multer.File[],
  ) {
    if (files.length === 0) return [];
    const maxBytes = this.config.get<number>("MAX_UPLOAD_BYTES", 5_242_880);
    const root = resolve(
      this.config.get<string>("PRIVATE_UPLOAD_DIR", "./private-uploads"),
    );
    const directory = resolve(root, "returns", customerId);
    if (!directory.startsWith(`${root}${sep}`)) {
      throw new BadRequestException("Invalid evidence path");
    }
    await mkdir(directory, { recursive: true });
    const stored: Array<Record<string, string | number>> = [];
    for (const file of files) {
      const expectedExtension = EVIDENCE_MIME.get(file.mimetype);
      if (
        !expectedExtension ||
        extname(file.originalname).toLowerCase() !== expectedExtension
      ) {
        throw new BadRequestException(
          "Return evidence must be a matching JPG, PNG, WEBP or PDF file",
        );
      }
      if (file.size > maxBytes) {
        throw new BadRequestException(`File exceeds ${maxBytes} bytes`);
      }
      const storageKey = `returns/${customerId}/${randomUUID()}${expectedExtension}`;
      await writeFile(resolve(root, storageKey), file.buffer, { flag: "wx" });
      stored.push({
        storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    }
    return stored;
  }
  async list(userId: string) {
    const requests = await this.prisma.returnRequest.findMany({
      where: { customer: { userId } },
      include: { orderItem: { include: { product: true } } },
      orderBy: { requestedAt: "desc" },
    });
    return requests.map((request) => this.presentReturn(request));
  }

  adminList() {
    return this.prisma.returnRequest.findMany({
      include: {
        customer: true,
        orderItem: { include: { product: true, vendorOrder: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async vendorList(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: { orderItem: { vendorOrder: { vendorId: await this.vendors.getVendorId(userId) } } },
      include: { orderItem: { include: { product: true, vendorOrder: true, replacement: true } } },
      orderBy: { requestedAt: "desc" },
    });
  }

  async updateStatus(id: string, status: ReturnStatus) {
    const request = await this.prisma.returnRequest.findUniqueOrThrow({
      where: { id },
      include: {
        orderItem: {
          include: {
            vendorOrder: {
              include: { masterOrder: { include: { payments: true } } },
            },
          },
        },
      },
    });
    const transitions: Record<ReturnStatus, ReturnStatus[]> = {
      REQUESTED: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
      APPROVED: [ReturnStatus.PICKUP_SCHEDULED],
      REJECTED: [],
      PICKUP_SCHEDULED: [ReturnStatus.RECEIVED],
      RECEIVED: [ReturnStatus.RESOLVED],
      RESOLVED: [],
    };
    if (!transitions[request.status].includes(status)) {
      throw new BadRequestException(
        `Return cannot move from ${request.status} to ${status}`,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === ReturnStatus.REJECTED) {
        await tx.orderItem.update({
          where: { id: request.orderItemId },
          data: { status: OrderStatus.DELIVERED, cancellable: false },
        });
      }
      if (status === ReturnStatus.RECEIVED) {
        if (request.resolution === ReturnResolution.REPLACEMENT) {
          await tx.replacement.upsert({
            where: { orderItemId: request.orderItemId },
            create: {
              orderItemId: request.orderItemId,
              reason: request.reason,
              status: "APPROVED",
            },
            update: { status: "APPROVED" },
          });
          await tx.orderItem.update({
            where: { id: request.orderItemId },
            data: { status: OrderStatus.REPLACEMENT_REQUESTED },
          });
        } else {
          const payment =
            request.orderItem.vendorOrder.masterOrder.payments.find(
              (candidate) =>
                candidate.status === PaymentStatus.PAID ||
                candidate.method === PaymentMethod.COD,
            );
          if (!payment) {
            throw new BadRequestException("No refundable payment was found");
          }
          await tx.refund.upsert({
            where: { idempotencyKey: `return:${request.id}` },
            create: {
              masterOrderId: request.orderItem.vendorOrder.masterOrderId,
              vendorOrderId: request.orderItem.vendorOrderId,
              orderItemId: request.orderItemId,
              paymentId: payment.id,
              method:
                payment.method === PaymentMethod.PREPAID
                  ? RefundMethod.RAZORPAY
                  : RefundMethod.BANK_TRANSFER,
              amount: request.orderItem.lineTotal,
              reason: request.reason,
              idempotencyKey: `return:${request.id}`,
            },
            update: {},
          });
          await tx.orderItem.update({
            where: { id: request.orderItemId },
            data: { status: OrderStatus.REFUND_PENDING },
          });
        }
      }
      if (
        status === ReturnStatus.RESOLVED &&
        request.resolution === ReturnResolution.REPLACEMENT
      ) {
        await tx.replacement.update({
          where: { orderItemId: request.orderItemId },
          data: { status: "DELIVERED" },
        });
        await tx.orderItem.update({
          where: { id: request.orderItemId },
          data: { status: OrderStatus.REPLACED },
        });
      }
      return tx.returnRequest.update({
        where: { id },
        data: {
          status,
          ...(status === ReturnStatus.REJECTED ||
          status === ReturnStatus.RESOLVED
            ? { resolvedAt: new Date() }
            : {}),
        },
      });
    });
    await this.notifications
      .notifyReturnStatus(updated.id, updated.status)
      .catch(() => undefined);
    return updated;
  }

  private presentReturn(request: {
    id: string;
    resolution: ReturnResolution;
    reason: string;
    status: ReturnStatus;
    requestedAt: Date;
    evidence: Prisma.JsonValue;
  }) {
    const evidence = Array.isArray(request.evidence) ? request.evidence : [];
    return {
      id: request.id,
      resolution: request.resolution,
      reason: request.reason,
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      attachmentNames: evidence.flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        if (
          entry &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          typeof entry.originalName === "string"
        ) {
          return [entry.originalName];
        }
        return [];
      }),
    };
  }
}
