import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import {
  InspectionStatus,
  VendorDocumentType,
  VerificationStatus,
} from "@prisma/client";

export class UpdateVendorDto {
  @IsOptional() @IsString() @IsNotEmpty() legalName?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
  panNumber?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() fssaiNumber?: string;
  @IsOptional() @IsString() @Matches(/^\d{6}$/) pickupPincode?: string;
  @IsOptional() @IsObject() businessAddress?: Record<string, string>;
}

export class UpdateVendorContactDto {
  @IsOptional() @IsEmail() businessEmail?: string;
  @IsString() @Matches(/^(?:\+91)?[6-9]\d{9}$/) businessMobile!: string;
}

export class BankAccountDto {
  @IsString() @IsNotEmpty() accountHolderName!: string;
  @IsString() @Matches(/^\d{8,20}$/) accountNumber!: string;
  @IsString() @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/) ifsc!: string;
  @IsString() @IsNotEmpty() bankName!: string;
  @IsOptional() @IsString() branchName?: string;
}

export class DocumentMetadataDto {
  @IsEnum(VendorDocumentType) type!: VendorDocumentType;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class VerifyDocumentDto {
  @IsEnum(VerificationStatus) status!: VerificationStatus;
  @IsOptional() @IsString() rejectionReason?: string;
}

export class CreateInspectionDto {
  @IsDateString() scheduledAt!: string;
  @IsString() @IsNotEmpty() location!: string;
  @IsObject() checklist!: Record<string, unknown>;
}

export class UpdateInspectionDto {
  @IsEnum(InspectionStatus) status!: InspectionStatus;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() @IsNotEmpty() location?: string;
  @IsOptional() @IsObject() checklist?: Record<string, unknown>;
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsBoolean() documentsVerified!: boolean;
  @IsBoolean() premisesVerified!: boolean;
  @IsBoolean() qualityVerified!: boolean;
  @IsOptional() @IsObject() evidence?: Record<string, unknown>;
}
