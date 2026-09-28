import { Module } from "@nestjs/common";
import { VendorsModule } from "../vendors/vendors.module";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";
@Module({
  imports: [VendorsModule],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
