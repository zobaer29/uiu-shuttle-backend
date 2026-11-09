"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const pg_1 = require("pg");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    pool;
    logger = new common_1.Logger(DatabaseService_1.name);
    dbTarget;
    constructor(config) {
        const target = config.get("DB_TARGET")?.toLowerCase() || "neon";
        this.dbTarget = target;
        let connectionString = config.get("DATABASE_URL");
        if (target === "local" && config.get("LOCAL_DATABASE_URL")) {
            connectionString = config.get("LOCAL_DATABASE_URL");
        }
        else if (target === "neon" && config.get("NEON_DATABASE_URL")) {
            connectionString = config.get("NEON_DATABASE_URL");
        }
        if (!connectionString) {
            throw new Error(`Database connection string for target '${target}' is required`);
        }
        const isSsl = connectionString.includes("sslmode=require") ||
            connectionString.includes("neon.tech") ||
            config.get("NODE_ENV") === "production";
        this.pool = new pg_1.Pool({
            connectionString,
            ssl: isSsl ? { rejectUnauthorized: false } : undefined,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
    }
    query(text, values = []) {
        return this.pool.query(text, values);
    }
    async onModuleInit() {
        try {
            await this.pool.query("SELECT 1");
            this.logger.log(`Database connection established successfully [Mode: ${this.dbTarget.toUpperCase()}].`);
        }
        catch (err) {
            this.logger.error(`Database connection error [Mode: ${this.dbTarget.toUpperCase()}]: ${err.message}`);
        }
    }
    async pruneOldGpsData() {
        this.logger.log("Running scheduled GPS data retention cleanup...");
        try {
            const tripLocations = await this.pool.query(`DELETE FROM trip_locations WHERE recorded_at < NOW() - INTERVAL '30 days'`);
            const userLocations = await this.pool.query(`DELETE FROM user_locations WHERE recorded_at < NOW() - INTERVAL '30 days'`);
            this.logger.log(`GPS cleanup complete: Deleted ${tripLocations.rowCount ?? 0} trip locations and ${userLocations.rowCount ?? 0} user locations.`);
        }
        catch (err) {
            this.logger.error(`Failed to prune old GPS data: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        await this.pool.end();
    }
};
exports.DatabaseService = DatabaseService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DatabaseService.prototype, "pruneOldGpsData", null);
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map