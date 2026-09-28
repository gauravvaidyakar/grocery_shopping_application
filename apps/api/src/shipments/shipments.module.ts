import { Module } from "@nestjs/common";
import {
  ShipmentsController,
  ShipmentWebhooksController,
} from "./shipments.controller";
import { ShippingService, ShipmentsService } from "./shipments.service";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({
  imports: [NotificationsModule],
  controllers: [ShipmentsController, ShipmentWebhooksController],
  providers: [ShippingService, ShipmentsService],
  exports: [ShippingService, ShipmentsService],
})
export class ShipmentsModule {}
