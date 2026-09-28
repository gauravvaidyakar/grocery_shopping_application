import { Role } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";

export class RegisterDto {
  @IsOptional() @IsEnum(Role) role: Role = Role.CUSTOMER;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^(?:\+91)?[6-9]\d{9}$/) mobile?: string;
  @IsString() @MinLength(10) password!: string;
  @ValidateIf((dto: RegisterDto) => dto.role === Role.CUSTOMER && !dto.name)
  @IsString()
  @IsNotEmpty()
  firstName?: string;
  @ValidateIf((dto: RegisterDto) => dto.role === Role.CUSTOMER && !dto.name)
  @IsString()
  @IsNotEmpty()
  lastName?: string;
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ValidateIf((dto: RegisterDto) => dto.role === Role.VENDOR)
  @IsString()
  @IsNotEmpty()
  businessName?: string;
  @ValidateIf((dto: RegisterDto) => dto.role === Role.VENDOR)
  @IsString()
  @IsNotEmpty()
  ownerName?: string;
  @ValidateIf((dto: RegisterDto) => dto.role === Role.VENDOR)
  @IsObject()
  businessAddress?: Record<string, string>;
}

export class LoginDto {
  @IsString() @IsNotEmpty() emailOrMobile!: string;
  @IsString() @IsNotEmpty() password!: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsString() @IsNotEmpty() emailOrMobile!: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() token!: string;
  @IsString()
  @MinLength(10)
  @Matches(/[A-Z]/, { message: "Password must include an uppercase letter" })
  @Matches(/[0-9]/, { message: "Password must include a number" })
  password!: string;
}

export class ChangeVendorPasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;

  @IsString()
  @MinLength(10)
  @Matches(/[A-Z]/, {
    message: "New password must include an uppercase letter",
  })
  @Matches(/[0-9]/, { message: "New password must include a number" })
  newPassword!: string;

  @IsString() @IsNotEmpty() confirmNewPassword!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "OTP must contain exactly 6 digits" })
  code!: string;
}

export class CustomerOtpChallengeDto {
  @IsString() @IsNotEmpty() challengeToken!: string;
}

export class VerifyCustomerOtpDto extends CustomerOtpChallengeDto {
  @IsString() @IsNotEmpty() accessToken!: string;
}
