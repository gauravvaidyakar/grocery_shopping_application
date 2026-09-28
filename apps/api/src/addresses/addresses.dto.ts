import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
export class AddressDto {
  @IsIn(["HOME", "WORK", "OTHER"]) label!: string;
  @IsString() @MaxLength(100) recipientName!: string;
  @Matches(/^(?:\+91)?[6-9]\d{9}$/) mobile!: string;
  @IsString() @MaxLength(200) line1!: string;
  @IsOptional() @IsString() @MaxLength(200) line2?: string;
  @IsOptional() @IsString() landmark?: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @Matches(/^\d{6}$/) pincode!: string;
  @IsBoolean() isDefault!: boolean;
}
