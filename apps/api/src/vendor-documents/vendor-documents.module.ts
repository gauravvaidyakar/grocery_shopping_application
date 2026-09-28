import { Module } from "@nestjs/common";
import { VendorsModule } from "../vendors/vendors.module";
import { VendorDocumentsController } from "./vendor-documents.controller";
import { VendorDocumentsService } from "./vendor-documents.service";

@Module({
  imports: [VendorsModule],
  controllers: [VendorDocumentsController],
  providers: [VendorDocumentsService],
  exports: [VendorDocumentsService],
})
export class VendorDocumentsModule {}
