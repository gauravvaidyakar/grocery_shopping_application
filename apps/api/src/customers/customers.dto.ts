import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from "class-validator";
export class UpdateCustomerDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsPhoneNumber("IN") mobile?: string;
  @IsOptional() @IsBoolean() marketingOptIn?: boolean;
}
