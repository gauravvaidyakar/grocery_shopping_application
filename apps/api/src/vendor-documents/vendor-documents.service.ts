import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role, VendorStatus, type VerificationStatus } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import type { RequestUser } from "../common/request-user";
import type { DocumentMetadataDto } from "../vendors/vendors.dto";
import { VendorsService } from "../vendors/vendors.service";

const ALLOWED_MIME = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

@Injectable()
export class VendorDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly config: ConfigService,
  ) {}

  async upload(
    userId: string,
    metadata: DocumentMetadataDto,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Document file is required");
    const expectedExtension = ALLOWED_MIME.get(file.mimetype);
    if (
      !expectedExtension ||
      extname(file.originalname).toLowerCase() !== expectedExtension
    )
      throw new BadRequestException(
        "Only matching PDF, JPG, PNG or WEBP files are accepted",
      );
    const maxBytes = this.config.get<number>("MAX_UPLOAD_BYTES", 5_242_880);
    if (file.size > maxBytes)
      throw new BadRequestException(`File exceeds ${maxBytes} bytes`);
    const vendor = await this.vendors.getByUser(userId);
    if (
      vendor.status === VendorStatus.APPROVED ||
      vendor.status === VendorStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        "Approved or suspended vendor documents require administrator review",
      );
    }
    const vendorId = vendor.id;
    const root = resolve(
      this.config.get<string>("PRIVATE_UPLOAD_DIR", "./private-uploads"),
    );
    const vendorDirectory = resolve(root, vendorId);
    if (!vendorDirectory.startsWith(`${root}${sep}`))
      throw new BadRequestException("Invalid upload path");
    await mkdir(vendorDirectory, { recursive: true });
    const storageKey = `${vendorId}/${randomUUID()}${expectedExtension}`;
    await writeFile(resolve(root, storageKey), file.buffer, { flag: "wx" });
    return this.prisma.vendorDocument.upsert({
      where: { vendorId_type: { vendorId, type: metadata.type } },
      create: {
        vendorId,
        type: metadata.type,
        originalName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        documentNumber: metadata.documentNumber,
        expiresAt: metadata.expiresAt
          ? new Date(metadata.expiresAt)
          : undefined,
      },
      update: {
        originalName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        documentNumber: metadata.documentNumber,
        expiresAt: metadata.expiresAt
          ? new Date(metadata.expiresAt)
          : undefined,
        status: "PENDING",
        rejectionReason: null,
        verifiedAt: null,
        verifiedById: null,
      },
      select: {
        id: true,
        type: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async verify(
    documentId: string,
    actorId: string,
    status: VerificationStatus,
    rejectionReason?: string,
  ) {
    if (status === "PENDING")
      throw new BadRequestException(
        "Administrator verification must resolve to VERIFIED or REJECTED",
      );
    if (status === "REJECTED" && !rejectionReason)
      throw new BadRequestException("Rejection reason is required");
    const document = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException("Vendor document not found");
    const updated = await this.prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        verifiedById: actorId,
        verifiedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `VENDOR_DOCUMENT_${status}`,
        entityType: "VendorDocument",
        entityId: documentId,
        previousValue: { status: document.status },
        newValue: { status, rejectionReason },
      },
    });
    return updated;
  }

  async download(
    user: RequestUser,
    documentId: string,
  ): Promise<{ bytes: Buffer; mimeType: string; name: string }> {
    const document = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
      include: { vendor: { select: { userId: true } } },
    });
    if (!document) throw new NotFoundException("Vendor document not found");
    if (user.role !== Role.ADMIN && document.vendor.userId !== user.id)
      throw new ForbiddenException("You cannot access another vendor document");
    const root = resolve(
      this.config.get<string>("PRIVATE_UPLOAD_DIR", "./private-uploads"),
    );
    const absolute = resolve(root, document.storageKey);
    if (!absolute.startsWith(`${root}${sep}`))
      throw new ForbiddenException("Invalid document storage path");
    return {
      bytes: await readFile(absolute),
      mimeType: document.mimeType,
      name: document.originalName,
    };
  }
}
