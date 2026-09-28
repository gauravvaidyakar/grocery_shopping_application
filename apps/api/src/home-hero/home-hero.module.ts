import { Module } from "@nestjs/common";
import { HomeHeroController } from "./home-hero.controller";
import { HomeHeroImageService } from "./home-hero-image.service";
import { HomeHeroService } from "./home-hero.service";

@Module({
  controllers: [HomeHeroController],
  providers: [HomeHeroService, HomeHeroImageService],
})
export class HomeHeroModule {}
