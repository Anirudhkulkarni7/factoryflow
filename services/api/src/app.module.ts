import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { Plant } from "./entities/plant.entity";
import { User } from "./entities/user.entity";
import { AuthModule } from "./auth/auth.module";
import { PlantsModule } from "./plants/plants.module";
import { UsersModule } from "./users/users.module";


@Module({
  imports: [
ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),

    TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => {
    
const pass = (cfg.get<string>("DB_PASS") ?? "").trim();
    console.log("DB DEBUG", {
  host: cfg.get<string>("DB_HOST"),
  port: cfg.get<string>("DB_PORT"),
  user: cfg.get<string>("DB_USER"),
  pass: cfg.get<string>("DB_PASS"),
  db: cfg.get<string>("DB_NAME"),
});
    return {
      type: "postgres",
      host: cfg.get<string>("DB_HOST"),
      port: Number(cfg.get<string>("DB_PORT")),
      username: cfg.get<string>("DB_USER"),
password: pass.length > 0 ? pass : undefined,
      database: cfg.get<string>("DB_NAME"),
      entities: [User, Plant],
      synchronize: true,
    };
    
  },
}),
    AuthModule,
    PlantsModule,
    UsersModule,


  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
