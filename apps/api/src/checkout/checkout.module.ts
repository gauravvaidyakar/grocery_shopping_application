import { Module } from "@nestjs/common";
import { ShipmentsModule } from "../shipments/shipments.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
@Module({
  imports: [ShipmentsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
