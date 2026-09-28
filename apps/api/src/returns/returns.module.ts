import { Module } from "@nestjs/common";
import { ReturnsController } from "./returns.controller";
import { ReturnsService } from "./returns.service";
import { VendorsModule } from "../vendors/vendors.module";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({
  imports: [VendorsModule, NotificationsModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
