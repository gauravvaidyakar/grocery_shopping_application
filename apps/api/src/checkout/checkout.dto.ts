import { PaymentMethod } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
export class ValidateCheckoutDto {
  @IsUUID() addressId!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
}
