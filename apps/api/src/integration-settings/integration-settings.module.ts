import { Global, Module } from "@nestjs/common";
import { FieldEncryptionService } from "../common/field-encryption.service";
import { IntegrationSettingsService } from "./integration-settings.service";

@Global()
@Module({
  providers: [FieldEncryptionService, IntegrationSettingsService],
  exports: [IntegrationSettingsService],
})
export class IntegrationSettingsModule {}
