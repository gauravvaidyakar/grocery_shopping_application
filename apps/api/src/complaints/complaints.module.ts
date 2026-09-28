import { Module } from "@nestjs/common";
import { ComplaintsController } from "./complaints.controller";
import { ComplaintsService } from "./complaints.service";
import { VendorsModule } from "../vendors/vendors.module";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({
  imports: [VendorsModule, NotificationsModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
