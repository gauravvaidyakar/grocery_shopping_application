import { Module } from "@nestjs/common";
import { VendorsModule } from "../vendors/vendors.module";
import { VendorInspectionsService } from "./vendor-inspections.service";

@Module({
  imports: [VendorsModule],
  providers: [VendorInspectionsService],
  exports: [VendorInspectionsService],
})
export class VendorInspectionsModule {}
