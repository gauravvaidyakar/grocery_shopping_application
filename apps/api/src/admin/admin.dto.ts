import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { VendorSuspensionReason, VerificationStatus } from "../database/domain.types";

export class DecisionDto {
  @IsString() @MaxLength(1000) reason!: string;
}
export class SuspensionDto {
  @IsEnum(VendorSuspensionReason) reason!: VendorSuspensionReason;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
export class BankVerificationDto {
  @IsEnum(VerificationStatus) status!: VerificationStatus;
  @IsOptional() @IsString() reason?: string;
}
