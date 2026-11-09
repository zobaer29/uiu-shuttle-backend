import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { DatabaseService } from "./database.service";
import { ShuttleController } from "./shuttle.controller";
import { ShuttleGateway } from "./shuttle.gateway";
import { JwtStrategy } from "./auth/jwt.strategy";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { Public } from "./auth/roles.decorator";

@Controller("health")
class HealthController {
  @Public()
  @Get()
  getHealth() {
    return { status: "ok", service: "uiu-shuttle-backend", timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET", "local-development-secret-change-me"),
        signOptions: { expiresIn: "2h" },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController, AuthController, ShuttleController],
  providers: [
    DatabaseService,
    ShuttleGateway,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
