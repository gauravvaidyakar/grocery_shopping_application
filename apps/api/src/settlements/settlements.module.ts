import { Module } from "@nestjs/common";
import { VendorsModule } from "../vendors/vendors.module";
import { SettlementsController } from "./settlements.controller";
import { SettlementsService } from "./settlements.service";

@Module({
  imports: [VendorsModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
