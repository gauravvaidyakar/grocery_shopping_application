import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min } from "class-validator";
import { IsEnum } from "class-validator";
import { ReviewStatus } from "@prisma/client";
export class CreateReviewDto {
  @IsUUID() orderItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @MaxLength(2000) comment!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsUrl({}, { each: true }) imageUrls?: string[];
}

export class UpdateReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @MaxLength(2000) comment!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsUrl({}, { each: true }) imageUrls?: string[];
}

export class ReportReviewDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus) status!: ReviewStatus;
}
