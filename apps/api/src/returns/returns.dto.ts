import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";
import { ReturnResolution } from "../database/domain.types";
import { ReturnStatus } from "../database/domain.types";
export class CreateReturnDto {
  @IsString() @MaxLength(1000) reason!: string;
  @IsEnum(ReturnResolution) resolution!: ReturnResolution;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) evidenceUrls?: string[];
}

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus) status!: ReturnStatus;
}
