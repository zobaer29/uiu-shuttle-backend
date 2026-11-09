import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Request Body Size Limit (prevents large payload DoS)
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: true, limit: "100kb" }));

  // CORS Configuration
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
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow mobile apps / curl / server-to-server (where origin is undefined)
      if (!origin || origins.includes("*") || origins.includes(origin) || origin.startsWith("http://10.") || origin.startsWith("http://192.168.")) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0");
  console.log(`UIU Shuttle Backend listening on port ${port}`);
}

void bootstrap();
