import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ComplaintCategory, ComplaintStatus } from "@prisma/client";
export class CreateComplaintDto {
  @IsString() @MaxLength(200) subject!: string;
  @IsEnum(ComplaintCategory) category!: ComplaintCategory;
  @IsString() @MaxLength(5000) message!: string;
  @IsOptional() @IsUUID() relatedOrderId?: string;
  @IsOptional() @IsUUID() relatedOrderItemId?: string;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) attachmentUrls?: string[];
}
export class ComplaintMessageDto {
  @IsString() @MaxLength(5000) message!: string;
}
export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus) status!: ComplaintStatus;
  @IsOptional() @IsString() @MaxLength(5000) resolution?: string;
}
