import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoDatabaseService } from "./mongo-database.service";

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("MONGODB_URI"),
        dbName: config.get<string>("MONGODB_DATABASE", "grocery_web_application"),
        retryWrites: true,
        maxPoolSize: 10,
      }),
    }),
  ],
  providers: [MongoDatabaseService],
  exports: [MongoDatabaseService],
})
export class DatabaseModule {}
