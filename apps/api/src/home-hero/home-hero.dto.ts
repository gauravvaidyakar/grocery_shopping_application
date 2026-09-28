import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

const internalPath = /^\/(?!\/)[A-Za-z0-9/_?=&%.-]*$/;

export class CreateHomeHeroSlideDto {
  @IsString() @MaxLength(80) eyebrow!: string;
  @IsString() @MaxLength(140) title!: string;
  @IsString() @MaxLength(320) description!: string;
  @IsString() @MaxLength(40) ctaLabel!: string;
  @IsString()
  @MaxLength(240)
  @Matches(internalPath, { message: "ctaHref must be an internal application path" })
  ctaHref!: string;
  @IsString() @MaxLength(180) imageAlt!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateHomeHeroSlideDto {
  @IsOptional() @IsString() @MaxLength(80) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MaxLength(320) description?: string;
  @IsOptional() @IsString() @MaxLength(40) ctaLabel?: string;
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Matches(internalPath, { message: "ctaHref must be an internal application path" })
  ctaHref?: string;
  @IsOptional() @IsString() @MaxLength(180) imageAlt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
