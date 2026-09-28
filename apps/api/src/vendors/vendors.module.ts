import { Module } from "@nestjs/common";
import { FieldEncryptionService } from "../common/field-encryption.service";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, FieldEncryptionService],
  exports: [VendorsService],
})
export class VendorsModule {}
