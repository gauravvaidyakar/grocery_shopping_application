import { IsString, MaxLength, MinLength } from "class-validator";

export class CompleteBankRefundDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  providerReference!: string;
}
