import { IsString, IsUUID } from "class-validator";
export class CreatePaymentDto {
  @IsUUID() masterOrderId!: string;
}
export class VerifyPaymentDto {
  @IsUUID() paymentId!: string;
  @IsString() providerOrderId!: string;
  @IsString() providerPaymentId!: string;
  @IsString() providerSignature!: string;
}
