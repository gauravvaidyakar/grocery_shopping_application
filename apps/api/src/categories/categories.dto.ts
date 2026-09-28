import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCategoryDto {
  @IsString() @MaxLength(100) name!: string;
  @IsString() @MaxLength(120) slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateCategoryDto extends CreateCategoryDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
