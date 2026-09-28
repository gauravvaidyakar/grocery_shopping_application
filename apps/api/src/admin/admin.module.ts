import { Module } from "@nestjs/common";
import { VendorDocumentsModule } from "../vendor-documents/vendor-documents.module";
import { VendorInspectionsModule } from "../vendor-inspections/vendor-inspections.module";
import { VendorsModule } from "../vendors/vendors.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
@Module({
  imports: [VendorsModule, VendorDocumentsModule, VendorInspectionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
