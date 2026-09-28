import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { RefundsController } from "./refunds.controller";
import { RefundsService } from "./refunds.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
