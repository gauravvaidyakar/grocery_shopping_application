import { Module } from "@nestjs/common";
import { VendorsModule } from "../vendors/vendors.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
@Module({
  imports: [VendorsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
