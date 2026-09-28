import { IsEnum, IsString, IsUUID, MaxLength } from "class-validator";
import { OrderStatus, PaymentMethod } from "@prisma/client";
export class CreateOrderDto {
  @IsUUID() quoteId!: string;
  @IsUUID() addressId!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
}
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
}
export class CancelItemDto {
  @IsString() @MaxLength(500) reason!: string;
}
