import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
export declare class DatabaseService implements OnModuleDestroy, OnModuleInit {
    private readonly pool;
    private readonly logger;
    private readonly dbTarget;
    constructor(config: ConfigService);
    query<T extends object>(text: string, values?: unknown[]): Promise<import("pg").QueryResult<T>>;
    onModuleInit(): Promise<void>;
    pruneOldGpsData(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
