import { IsString, MaxLength, MinLength } from "class-validator";

export class CompleteSettlementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  providerReference!: string;
}
