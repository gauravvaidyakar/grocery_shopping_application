import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateIntegrationSettingsDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(512)
  RAZORPAY_KEY_ID?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(512)
  RAZORPAY_KEY_SECRET?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(512)
  RAZORPAY_WEBHOOK_SECRET?: string;

  @IsOptional() @IsString() @MinLength(3) @MaxLength(320)
  SHIPROCKET_EMAIL?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(512)
  SHIPROCKET_PASSWORD?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(512)
  SHIPROCKET_WEBHOOK_SECRET?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(1024)
  INTERAKT_API_KEY?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(512)
  MSG91_AUTH_KEY?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(128)
  MSG91_WIDGET_ID?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(1024)
  MSG91_WIDGET_TOKEN?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(128)
  MSG91_OTP_TEMPLATE_ID?: string;
}
