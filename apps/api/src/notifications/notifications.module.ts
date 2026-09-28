import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { WhatsAppProviderRouter } from "./whatsapp-provider";
import { SmsProviderRouter } from "./sms-provider";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WhatsAppProviderRouter, SmsProviderRouter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
