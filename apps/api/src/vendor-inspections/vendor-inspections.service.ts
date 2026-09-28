import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InspectionStatus, Prisma, VendorStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { VendorsService } from "../vendors/vendors.service";
import type {
  CreateInspectionDto,
  UpdateInspectionDto,
} from "../vendors/vendors.dto";

const ALLOWED_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  [InspectionStatus.SCHEDULED]: [
    InspectionStatus.SCHEDULED,
    InspectionStatus.IN_PROGRESS,
    InspectionStatus.CANCELLED,
  ],
  [InspectionStatus.IN_PROGRESS]: [
    InspectionStatus.PASSED,
    InspectionStatus.FAILED,
    InspectionStatus.NEEDS_REVIEW,
  ],
  [InspectionStatus.PASSED]: [],
  [InspectionStatus.FAILED]: [],
  [InspectionStatus.NEEDS_ACTION]: [InspectionStatus.IN_PROGRESS],
  [InspectionStatus.NEEDS_REVIEW]: [InspectionStatus.IN_PROGRESS],
  [InspectionStatus.CANCELLED]: [],
};

@Injectable()
export class VendorInspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}
  async create(
    vendorId: string,
    inspectorId: string,
    input: CreateInspectionDto,
  ) {
    await this.vendors.assertKycVerified(vendorId);
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { status: true },
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (
      vendor.status !== VendorStatus.REGISTERED &&
      vendor.status !== VendorStatus.DOCUMENTS_SUBMITTED &&
      vendor.status !== VendorStatus.INSPECTION
    )
      throw new BadRequestException(
        "Inspection can only be scheduled after KYC verification",
      );
    const activeInspection = await this.prisma.vendorInspection.findFirst({
      where: {
        vendorId,
        status: {
          in: [
            InspectionStatus.SCHEDULED,
            InspectionStatus.IN_PROGRESS,
            InspectionStatus.NEEDS_ACTION,
            InspectionStatus.NEEDS_REVIEW,
          ],
        },
      },
    });
    if (activeInspection)
      throw new BadRequestException(
        "An inspection is already scheduled or in progress",
      );
    const inspection = await this.prisma.vendorInspection.create({
      data: {
        vendorId,
        inspectorId,
        scheduledAt: new Date(input.scheduledAt),
        location: input.location,
        checklist: input.checklist as Prisma.InputJsonValue,
      },
    });
    await this.vendors.transition(
      vendorId,
      inspectorId,
      VendorStatus.INSPECTION,
      "Physical inspection scheduled",
    );
    return inspection;
  }
  list(vendorId: string) {
    return this.prisma.vendorInspection.findMany({
      where: { vendorId },
      orderBy: { scheduledAt: "desc" },
    });
  }
  async update(id: string, actorId: string, input: UpdateInspectionDto) {
    const current = await this.prisma.vendorInspection.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException("Inspection not found");
    if (!ALLOWED_TRANSITIONS[current.status].includes(input.status))
      throw new BadRequestException(
        `Inspection cannot move from ${current.status} to ${input.status}`,
      );
    const remarks = input.remarks?.trim();
    if (
      (input.status === InspectionStatus.FAILED ||
        input.status === InspectionStatus.NEEDS_ACTION ||
        input.status === InspectionStatus.NEEDS_REVIEW ||
        input.status === InspectionStatus.CANCELLED) &&
      !remarks
    )
      throw new BadRequestException(
        "A reason is required for failed, review or cancelled inspections",
      );
    if (
      input.status === InspectionStatus.PASSED &&
      input.checklist?.businessActivityVerified !== true
    )
      throw new BadRequestException(
        "Business activity must be verified to pass inspection",
      );
    if (
      input.status === InspectionStatus.PASSED &&
      (!input.documentsVerified ||
        !input.premisesVerified ||
        !input.qualityVerified)
    )
      throw new BadRequestException(
        "Documents, premises and quality must all be verified to pass inspection",
      );
    const updated = await this.prisma.vendorInspection.update({
      where: { id },
      data: {
        status: input.status,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : undefined,
        location: input.location?.trim() || undefined,
        checklist: input.checklist as Prisma.InputJsonValue | undefined,
        inspectedAt: input.inspectedAt
          ? new Date(input.inspectedAt)
          : input.status === InspectionStatus.PASSED ||
                input.status === InspectionStatus.FAILED ||
                input.status === InspectionStatus.NEEDS_REVIEW ||
                input.status === InspectionStatus.NEEDS_ACTION
            ? new Date()
            : undefined,
        remarks,
        documentsVerified: input.documentsVerified,
        premisesVerified: input.premisesVerified,
        qualityVerified: input.qualityVerified,
        evidence: input.evidence as Prisma.InputJsonValue | undefined,
      },
    });
    if (input.status === InspectionStatus.PASSED)
      await this.vendors.transition(
        current.vendorId,
        actorId,
        VendorStatus.PENDING,
        "Physical inspection passed; awaiting final approval",
      );
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "VENDOR_INSPECTION_UPDATED",
        entityType: "VendorInspection",
        entityId: id,
        previousValue: {
          status: current.status,
          scheduledAt: current.scheduledAt,
          location: current.location,
        },
        newValue: {
          status: input.status,
          scheduledAt: input.scheduledAt ?? current.scheduledAt,
          location: input.location ?? current.location,
          remarks,
        },
      },
    });
    return updated;
  }
}
