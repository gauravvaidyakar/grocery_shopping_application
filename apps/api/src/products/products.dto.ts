import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ProductStatus, ProductType } from "@prisma/client";
import { PaginationDto } from "../common/pagination.dto";

export class CreateProductDto {
  @IsUUID() categoryId!: string;
  @IsString() @MaxLength(180) name!: string;
  @IsString() @MaxLength(5000) description!: string;
  @IsEnum(ProductType) productType!: ProductType;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  mrp?: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  gstRate!: number;
  @Type(() => Number) @IsInt() @IsPositive() weightGrams!: number;
  @IsOptional() @Type(() => Number) @IsPositive() lengthCm?: number;
  @IsOptional() @Type(() => Number) @IsPositive() widthCm?: number;
  @IsOptional() @Type(() => Number) @IsPositive() heightCm?: number;
  @IsOptional() @IsString() ingredients?: string;
  @IsOptional() @IsObject() specifications?: Record<string, string>;
  @IsArray() @ArrayMaxSize(10) @IsUrl({}, { each: true }) images!: string[];
  @Type(() => Number) @IsInt() @Min(0) stock!: number;
}

export class UpdateProductDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @IsOptional() @Type(() => Number) @IsPositive() price?: number;
  @IsOptional() @Type(() => Number) @IsPositive() mrp?: number;
  @IsOptional() @Type(() => Number) @Min(0) @Max(100) gstRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() weightGrams?: number;
  @IsOptional() @IsString() ingredients?: string;
  @IsOptional() @IsObject() specifications?: Record<string, string>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  images?: string[];
}

export class ProductQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  available?: boolean;
  @IsOptional() @IsString() sort?:
    "POPULAR" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class RejectProductDto {
  @IsString() @MaxLength(1000) reason!: string;
}
export class InventoryAdjustmentDto {
  @Type(() => Number) @IsInt() quantity!: number;
  @IsString() @MaxLength(500) reason!: string;
}
