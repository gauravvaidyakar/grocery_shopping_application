import { Type } from "class-transformer";
import { IsInt, IsUUID, Max, Min } from "class-validator";
export class AddCartItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity!: number;
}
export class UpdateCartItemDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity!: number;
}
