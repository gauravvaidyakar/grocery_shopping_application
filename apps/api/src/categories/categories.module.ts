import { Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { CategoryImageStorageService } from "./category-image-storage.service";
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryImageStorageService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
