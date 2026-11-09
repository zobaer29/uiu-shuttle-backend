import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Pool } from "pg";

@Injectable()
export class DatabaseService implements OnModuleDestroy, OnModuleInit {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);
  private readonly dbTarget: string;

  constructor(config: ConfigService) {
    const target = config.get<string>("DB_TARGET")?.toLowerCase() || "neon";
    this.dbTarget = target;

    let connectionString = config.get<string>("DATABASE_URL");
    if (target === "local" && config.get<string>("LOCAL_DATABASE_URL")) {
      connectionString = config.get<string>("LOCAL_DATABASE_URL");
    } else if (target === "neon" && config.get<string>("NEON_DATABASE_URL")) {
      connectionString = config.get<string>("NEON_DATABASE_URL");
    }

    if (!connectionString) {
      throw new Error(`Database connection string for target '${target}' is required`);
    }

    const isSsl =
      connectionString.includes("sslmode=require") ||
      connectionString.includes("neon.tech") ||
      config.get<string>("NODE_ENV") === "production";

    this.pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 20, // Max concurrent connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  query<T extends object>(text: string, values: unknown[] = []) {
    return this.pool.query<T>(text, values);
  }

  async onModuleInit() {
    try {
      // Test database connectivity
      await this.pool.query("SELECT 1");
      this.logger.log(`Database connection established successfully [Mode: ${this.dbTarget.toUpperCase()}].`);
    } catch (err: any) {
      this.logger.error(`Database connection error [Mode: ${this.dbTarget.toUpperCase()}]: ${err.message}`);
    }
  }

  /**
   * Daily Data Retention Cleaner:
   * Prunes raw GPS coordinates older than 30 days to prevent unbounded database growth.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async pruneOldGpsData() {
    this.logger.log("Running scheduled GPS data retention cleanup...");
    try {
      const tripLocations = await this.pool.query(
        `DELETE FROM trip_locations WHERE recorded_at < NOW() - INTERVAL '30 days'`,
      );
      const userLocations = await this.pool.query(
        `DELETE FROM user_locations WHERE recorded_at < NOW() - INTERVAL '30 days'`,
      );
      this.logger.log(
        `GPS cleanup complete: Deleted ${tripLocations.rowCount ?? 0} trip locations and ${userLocations.rowCount ?? 0} user locations.`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to prune old GPS data: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
