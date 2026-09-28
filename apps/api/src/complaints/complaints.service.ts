import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ComplaintStatus, Prisma, Role } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { PrismaService } from "../database/prisma.service";
import type { CreateComplaintDto } from "./complaints.dto";
import { VendorsService } from "../vendors/vendors.service";
import { NotificationsService } from "../notifications/notifications.service";

const ATTACHMENT_MIME = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);

const CUSTOMER_COMPLAINT_INCLUDE = {
  messages: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ComplaintInclude;

type CustomerComplaint = Prisma.ComplaintGetPayload<{
  include: typeof CUSTOMER_COMPLAINT_INCLUDE;
}>;
@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}
  async create(
    userId: string,
    input: CreateComplaintDto,
    files: Express.Multer.File[] = [],
  ) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    const storedAttachments = await this.storeAttachments(customer.id, files);
    let orderItem: {
      vendorOrderId: string;
      vendorOrder: { vendorId: string };
    } | null = null;
    if (input.relatedOrderItemId)
      orderItem = await this.prisma.orderItem.findFirst({
        where: {
          id: input.relatedOrderItemId,
          vendorOrder: { masterOrder: { customerId: customer.id } },
        },
        select: {
          vendorOrderId: true,
          vendorOrder: { select: { vendorId: true } },
        },
      });
    if (input.relatedOrderItemId && !orderItem) {
      throw new NotFoundException("Related order item not found");
    }
    let masterOrderId: string | undefined;
    if (input.relatedOrderId) {
      const order = await this.prisma.masterOrder.findFirst({
        where: { id: input.relatedOrderId, customerId: customer.id },
        select: { id: true },
      });
      if (!order) throw new NotFoundException("Related order not found");
      masterOrderId = order.id;
    }
    const complaint = await this.prisma.complaint.create({
      data: {
        referenceNumber: `CMP-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`,
        customerId: customer.id,
        masterOrderId,
        vendorOrderId: orderItem?.vendorOrderId,
        orderItemId: input.relatedOrderItemId,
        vendorId: orderItem?.vendorOrder.vendorId,
        category: input.category,
        subject: input.subject,
        description: input.message,
        attachments: [...(input.attachmentUrls ?? []), ...storedAttachments],
        messages: {
          create: {
            authorId: userId,
            authorRole: Role.CUSTOMER,
            message: input.message,
          },
        },
      },
      include: CUSTOMER_COMPLAINT_INCLUDE,
    });
    void this.notifications.notifyComplaintStatus(complaint.id, "CREATED");
    return this.presentCustomerComplaint(complaint);
  }

  private async storeAttachments(
    customerId: string,
    files: Express.Multer.File[],
  ) {
    if (files.length === 0) return [];
    const maxBytes = this.config.get<number>("MAX_UPLOAD_BYTES", 5_242_880);
    const root = resolve(
      this.config.get<string>("PRIVATE_UPLOAD_DIR", "./private-uploads"),
    );
    const directory = resolve(root, "complaints", customerId);
    if (!directory.startsWith(`${root}${sep}`)) {
      throw new BadRequestException("Invalid attachment path");
    }
    await mkdir(directory, { recursive: true });
    const stored: Array<Record<string, string | number>> = [];
    for (const file of files) {
      const expectedExtension = ATTACHMENT_MIME.get(file.mimetype);
      if (
        !expectedExtension ||
        extname(file.originalname).toLowerCase() !== expectedExtension
      ) {
        throw new BadRequestException(
          "Complaint attachment must be a matching JPG, PNG, WEBP or PDF file",
        );
      }
      if (file.size > maxBytes) {
        throw new BadRequestException(`File exceeds ${maxBytes} bytes`);
      }
      const storageKey = `complaints/${customerId}/${randomUUID()}${expectedExtension}`;
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
    const complaints = await this.prisma.complaint.findMany({
      where: { customer: { userId } },
      include: CUSTOMER_COMPLAINT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return complaints.map((complaint) =>
      this.presentCustomerComplaint(complaint),
    );
  }
  async get(userId: string, id: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, customer: { userId } },
      include: CUSTOMER_COMPLAINT_INCLUDE,
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    return this.presentCustomerComplaint(complaint);
  }
  async message(userId: string, id: string, message: string) {
    await this.get(userId, id);
    const createdMessage = await this.prisma.complaintMessage.create({
      data: {
        complaintId: id,
        authorId: userId,
        authorRole: Role.CUSTOMER,
        message,
      },
    });
    void this.notifications.notifyComplaintStatus(id, `CUSTOMER_MESSAGE_${createdMessage.id}`);
    return this.get(userId, id);
  }

  adminList() {
    return this.prisma.complaint.findMany({
      include: { customer: true, vendor: true, messages: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async vendorList(userId: string) {
    const vendorId = await this.vendors.getVendorId(userId);
    return this.prisma.complaint.findMany({
      where: { vendorId },
      include: { messages: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async staffMessage(userId: string, role: Role, id: string, message: string) {
    if (role === Role.VENDOR) {
      const vendorId = await this.vendors.getVendorId(userId);
      const owned = await this.prisma.complaint.findFirst({
        where: { id, vendorId },
      });
      if (!owned) throw new NotFoundException("Complaint not found");
    } else {
      await this.prisma.complaint.findUniqueOrThrow({ where: { id } });
    }
    const createdMessage = await this.prisma.complaintMessage.create({
      data: { complaintId: id, authorId: userId, authorRole: role, message },
    });
    void this.notifications.notifyComplaintStatus(id, `${role}_MESSAGE_${createdMessage.id}`);
    return this.prisma.complaint.findUniqueOrThrow({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async updateStatus(id: string, status: ComplaintStatus, resolution?: string) {
    if (
      (status === ComplaintStatus.RESOLVED ||
        status === ComplaintStatus.CLOSED) &&
      !resolution
    ) {
      throw new BadRequestException("A resolution is required");
    }
    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: { status, ...(resolution ? { resolution } : {}) },
    });
    void this.notifications.notifyComplaintStatus(id, `STATUS_${status}`);
    return complaint;
  }

  private presentCustomerComplaint(complaint: CustomerComplaint) {
    const attachments = Array.isArray(complaint.attachments)
      ? complaint.attachments
      : [];
    return {
      id: complaint.id,
      referenceNumber: complaint.referenceNumber,
      subject: complaint.subject,
      category: complaint.category,
      status: complaint.status,
      relatedOrderId: complaint.masterOrderId ?? undefined,
      relatedOrderItemId: complaint.orderItemId ?? undefined,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      messages: complaint.messages.map((message) => ({
        id: message.id,
        author: message.authorRole === Role.CUSTOMER ? "CUSTOMER" : "SUPPORT",
        message: message.message,
        createdAt: message.createdAt.toISOString(),
      })),
      attachmentNames: attachments.flatMap((attachment) => {
        if (typeof attachment === "string") return [attachment];
        if (
          attachment &&
          typeof attachment === "object" &&
          !Array.isArray(attachment) &&
          typeof attachment.originalName === "string"
        ) {
          return [attachment.originalName];
        }
        return [];
      }),
    };
  }
}
