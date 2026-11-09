"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = require("helmet");
const express_1 = require("express");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use((0, express_1.json)({ limit: "100kb" }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: "100kb" }));
    const origins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
        ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || origins.includes("*") || origins.includes(origin) || origin.startsWith("http://10.") || origin.startsWith("http://192.168.")) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const port = process.env.PORT ?? 3001;
    await app.listen(port, "0.0.0.0");
    console.log(`UIU Shuttle Backend listening on port ${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map