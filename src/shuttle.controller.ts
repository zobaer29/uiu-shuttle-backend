import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as fs from "fs";
import * as path from "path";
import type { Response } from "express";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { hash } from "bcryptjs";
import { DatabaseService } from "./database.service";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { Public, Roles } from "./auth/roles.decorator";
import { ShuttleGateway } from "./shuttle.gateway";

class OccupancyDto {
  @IsInt()
  @Min(0)
  passengerCount!: number;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

class DriverDto {
  @IsString()
  @MinLength(2)
  universityId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class TripDto {
  @IsString()
  routeId!: string;

  @IsString()
  busId!: string;

  @IsString()
  driverId!: string;

  @IsIn(["outbound", "return"])
  direction!: "outbound" | "return";
}

class LocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  accuracyMeters?: number;
}

class StudentLocationDto extends LocationDto {
  @IsString()
  studentId!: string;
}

class BusDto {
  @IsString()
  @MinLength(2)
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

class ScheduleDto {
  @IsString()
  routeId!: string;

  @IsIn(["outbound", "return"])
  direction!: "outbound" | "return";

  @IsString()
  departureTime!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ShuttleController {
  private cachedActiveTrips: { data: any[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 5000; // 5-second in-memory cache to handle traffic spikes

  constructor(
    private readonly database: DatabaseService,
    private readonly shuttleGateway: ShuttleGateway,
  ) {}

  @Public()
  @Get("routes")
  routes() {
    return this.database
      .query(
        `SELECT id, route_number, name, origin_name, destination_name, is_active
         FROM routes WHERE is_active = TRUE ORDER BY route_number`,
      )
      .then((result) => result.rows);
  }

  @Public()
  @Get("schedules")
  schedules() {
    return this.database
      .query(
        `SELECT schedules.id, schedules.direction, schedules.departure_time,
                routes.id AS route_id, routes.name AS route_name
         FROM schedules JOIN routes ON routes.id = schedules.route_id
         WHERE schedules.is_active = TRUE
         ORDER BY schedules.departure_time`,
      )
      .then((result) => result.rows);
  }

  @Public()
  @Get("schedules/pdf/info")
  getSchedulePdfInfo() {
    const filePath = path.join(process.cwd(), "uploads", "time-schedule-of-shuttle-services.pdf");
    const metaPath = path.join(process.cwd(), "uploads", "schedule-metadata.json");

    if (!fs.existsSync(filePath)) {
      return { exists: false };
    }

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        return { exists: true, ...meta, url: "/schedules/pdf" };
      } catch {
        // Fallback to stat
      }
    }

    const stat = fs.statSync(filePath);
    return {
      exists: true,
      title: "Time Schedule of Shuttle Services",
      filename: "time-schedule-of-shuttle-services.pdf",
      size: stat.size,
      mimeType: "application/pdf",
      uploadedAt: stat.mtime.toISOString(),
      url: "/schedules/pdf",
    };
  }

  @Public()
  @Get("schedules/pdf")
  getSchedulePdf(@Res() res: Response) {
    const filePath = path.join(process.cwd(), "uploads", "time-schedule-of-shuttle-services.pdf");
    if (!fs.existsSync(filePath)) {
      throw new HttpException("Schedule PDF not found", HttpStatus.NOT_FOUND);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="time-schedule-of-shuttle-services.pdf"');
    res.setHeader("Cache-Control", "no-cache");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Roles("admin")
  @Post("schedules/pdf")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
          cb(null, true);
        } else {
          cb(new HttpException("Only PDF files are allowed", HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  uploadSchedulePdf(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new HttpException("No PDF file provided", HttpStatus.BAD_REQUEST);
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const targetPath = path.join(uploadsDir, "time-schedule-of-shuttle-services.pdf");
    fs.writeFileSync(targetPath, file.buffer);

    const meta = {
      title: "Time Schedule of Shuttle Services",
      filename: "time-schedule-of-shuttle-services.pdf",
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user?.fullName ?? "Admin",
    };

    fs.writeFileSync(path.join(uploadsDir, "schedule-metadata.json"), JSON.stringify(meta, null, 2));

    this.shuttleGateway.server.emit("schedule:pdfUpdated", {
      ...meta,
      url: "/schedules/pdf",
    });

    return {
      success: true,
      message: "Time Schedule PDF uploaded successfully",
      ...meta,
      url: "/schedules/pdf",
    };
  }

  @Roles("admin")
  @Delete("schedules/pdf")
  deleteSchedulePdf() {
    const filePath = path.join(process.cwd(), "uploads", "time-schedule-of-shuttle-services.pdf");
    const metaPath = path.join(process.cwd(), "uploads", "schedule-metadata.json");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    this.shuttleGateway.server.emit("schedule:pdfUpdated", { exists: false });

    return { success: true, message: "Schedule PDF deleted" };
  }

  @Roles("admin")
  @Post("schedules")
  async createSchedule(@Body() schedule: ScheduleDto) {
    const result = await this.database.query(
      `INSERT INTO schedules (route_id, direction, departure_time, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, route_id, direction, departure_time, is_active`,
      [schedule.routeId, schedule.direction, schedule.departureTime],
    );
    this.shuttleGateway.server?.emit("schedule:updated");
    return result.rows[0];
  }

  @Roles("admin")
  @Delete("schedules/:id")
  async deleteSchedule(@Param("id") id: string) {
    const result = await this.database.query(
      `DELETE FROM schedules WHERE id = $1 RETURNING id`,
      [id],
    );
    this.shuttleGateway.server?.emit("schedule:updated");
    return result.rows[0] ?? null;
  }

  @Public()
  @Get("contacts")
  contacts() {
    return this.database
      .query(
        `SELECT id, label, phone_number, description, is_emergency
         FROM service_contacts WHERE is_active = TRUE ORDER BY display_order`,
      )
      .then((result) => result.rows);
  }

  @Public()
  @Get("trips/active")
  async activeTrips() {
    const now = Date.now();
    if (this.cachedActiveTrips && now - this.cachedActiveTrips.timestamp < this.CACHE_TTL_MS) {
      return this.cachedActiveTrips.data;
    }

    const rows = await this.database
      .query(
        `SELECT trips.id, trips.route_id, trips.direction, trips.status, trips.started_at,
                routes.name AS route_name, buses.display_name, buses.registration_number,
                latest.latitude, latest.longitude, latest.accuracy_meters, latest.recorded_at
         FROM trips
         JOIN routes ON routes.id = trips.route_id
         JOIN buses ON buses.id = trips.bus_id
         LEFT JOIN LATERAL (
           SELECT latitude, longitude, accuracy_meters, recorded_at
           FROM trip_locations WHERE trip_id = trips.id
           ORDER BY recorded_at DESC LIMIT 1
         ) latest ON TRUE
         WHERE trips.status = 'active'
         ORDER BY trips.started_at DESC`,
      )
      .then((result) => result.rows);

    this.cachedActiveTrips = { data: rows, timestamp: now };
    return rows;
  }

  @Roles("admin")
  @Get("drivers")
  drivers() {
    return this.database
      .query(
        `SELECT id, university_id, full_name, email, phone, status
         FROM app_users WHERE role = 'driver' ORDER BY full_name`,
      )
      .then((result) => result.rows);
  }

  @Roles("admin")
  @Get("students")
  students() {
    return this.database
      .query(
        `SELECT id, university_id, full_name, email
         FROM app_users WHERE role = 'student' AND status = 'active'
         ORDER BY full_name`,
      )
      .then((result) => result.rows);
  }

  @Roles("admin", "student")
  @Get("students/:studentId/location")
  studentLocation(@Param("studentId") studentId: string, @Req() req: any) {
    if (req.user?.role === "student" && req.user.id !== studentId) {
      throw new ForbiddenException("You can only access your own location data");
    }
    return this.database
      .query(
        `SELECT id, user_id, latitude, longitude, accuracy_meters, recorded_at
         FROM user_locations WHERE user_id = $1
         ORDER BY recorded_at DESC LIMIT 1`,
        [studentId],
      )
      .then((result) => result.rows[0] ?? null);
  }

  @Roles("student", "admin", "driver")
  @Post("students/location")
  recordStudentLocation(@Body() location: StudentLocationDto, @Req() req: any) {
    if (req.user?.role === "student" && req.user.id !== location.studentId) {
      throw new ForbiddenException("You cannot post location on behalf of another user");
    }
    return this.database
      .query(
        `INSERT INTO user_locations (user_id, latitude, longitude, accuracy_meters)
         SELECT id, $2, $3, $4 FROM app_users
         WHERE id = $1 AND role = 'student' AND status = 'active'
         RETURNING id, user_id, latitude, longitude, accuracy_meters, recorded_at`,
        [
          location.studentId,
          location.latitude,
          location.longitude,
          location.accuracyMeters ?? null,
        ],
      )
      .then((result) => result.rows[0] ?? null);
  }

  @Public()
  @Get("buses")
  buses() {
    return this.database
      .query(
        `SELECT id, registration_number, display_name, capacity, is_active
         FROM buses ORDER BY registration_number`,
      )
      .then((result) => result.rows);
  }

  @Roles("admin")
  @Post("buses")
  createBus(@Body() bus: BusDto) {
    return this.database
      .query(
        `INSERT INTO buses (registration_number, display_name, capacity)
         VALUES ($1, $2, $3)
         RETURNING id, registration_number, display_name, capacity, is_active`,
        [bus.registrationNumber, bus.displayName ?? null, bus.capacity],
      )
      .then((result) => result.rows[0]);
  }

  @Roles("admin")
  @Get("reports/summary")
  reportSummary() {
    return this.database
      .query(
        `SELECT routes.name AS route_name,
                COUNT(DISTINCT trips.id)::text AS trip_count,
                COALESCE(SUM(occupancy_events.passenger_count), 0)::text AS passenger_count
         FROM routes
         LEFT JOIN trips ON trips.route_id = routes.id
         LEFT JOIN occupancy_events ON occupancy_events.trip_id = trips.id
         GROUP BY routes.id, routes.name
         ORDER BY routes.route_number`,
      )
      .then((result) => result.rows);
  }

  @Roles("driver", "admin")
  @Post("trips/:tripId/occupancy")
  async recordOccupancy(
    @Param("tripId") tripId: string,
    @Body() occupancy: OccupancyDto,
  ) {
    return this.database
      .query(
        `INSERT INTO occupancy_events
           (trip_id, event_type, passenger_count, latitude, longitude)
         VALUES ($1, 'adjusted', $2, $3, $4)
         RETURNING id, trip_id, passenger_count, recorded_at`,
        [
          tripId,
          occupancy.passengerCount,
          occupancy.latitude,
          occupancy.longitude,
        ],
      )
      .then((result) => result.rows[0]);
  }

  @Roles("admin")
  @Post("drivers")
  async createDriver(@Body() driver: DriverDto) {
    const passwordHash = await hash(driver.password, 12);
    return this.database
      .query(
        `INSERT INTO app_users (role, university_id, email, password_hash, full_name, phone, status)
         VALUES ('driver', $1, $2, $3, $4, $5, 'active')
         RETURNING id, university_id, email, full_name, phone, status`,
        [
          driver.universityId,
          driver.email,
          passwordHash,
          driver.fullName,
          driver.phone ?? null,
        ],
      )
      .then((result) => result.rows[0]);
  }

  @Roles("driver", "admin")
  @Post("trips")
  startTrip(@Body() trip: TripDto, @Req() req: any) {
    if (req.user?.role === "driver" && req.user.id !== trip.driverId) {
      throw new ForbiddenException("Drivers can only start their own assigned trips");
    }
    return this.database
      .query(
        `SELECT id, route_id, bus_id, driver_id, direction, status, started_at
         FROM trips
         WHERE status = 'active' AND (bus_id = $1 OR driver_id = $2)
         ORDER BY started_at DESC LIMIT 1`,
        [trip.busId, trip.driverId],
      )
      .then(async (activeResult) => {
        if (activeResult.rows[0]) {
          return activeResult.rows[0];
        }

        const newTrip = await this.database
          .query<{ id: string; route_id: string; bus_id: string; driver_id: string; direction: string; status: "active"; started_at: string }>(
            `INSERT INTO trips (route_id, bus_id, driver_id, direction, status, started_at)
             VALUES ($1, $2, $3, $4, 'active', now())
             RETURNING id, route_id, bus_id, driver_id, direction, status, started_at`,
            [trip.routeId, trip.busId, trip.driverId, trip.direction],
          )
          .then((result) => result.rows[0]);

        this.cachedActiveTrips = null;
        this.shuttleGateway.broadcastTripStatus({
          tripId: newTrip.id,
          routeId: newTrip.route_id,
          status: "active",
        });

        return newTrip;
      });
  }

  @Roles("driver", "admin")
  @Put("trips/:tripId/end")
  async endTrip(@Param("tripId") tripId: string) {
    const updated = await this.database
      .query<{ id: string; route_id: string; status: "completed"; started_at: string; ended_at: string }>(
        `UPDATE trips SET status = 'completed', ended_at = now()
         WHERE id = $1 AND status = 'active'
         RETURNING id, route_id, status, started_at, ended_at`,
        [tripId],
      )
      .then((result) => result.rows[0] ?? null);

    if (updated) {
      this.cachedActiveTrips = null;
      this.shuttleGateway.broadcastTripStatus({
        tripId,
        routeId: updated.route_id,
        status: "completed",
      });
    }

    return updated;
  }

  @Roles("driver", "admin")
  @Put("trips/:tripId/cancel")
  async cancelTrip(@Param("tripId") tripId: string) {
    const updated = await this.database
      .query<{ id: string; route_id: string; status: "cancelled"; started_at: string; ended_at: string }>(
        `UPDATE trips SET status = 'cancelled', ended_at = now()
         WHERE id = $1 AND status = 'active'
         RETURNING id, route_id, status, started_at, ended_at`,
        [tripId],
      )
      .then((result) => result.rows[0] ?? null);

    if (updated) {
      this.cachedActiveTrips = null;
      this.shuttleGateway.broadcastTripStatus({
        tripId,
        routeId: updated.route_id,
        status: "cancelled",
      });
    }

    return updated;
  }

  @Roles("driver", "admin")
  @Post("trips/:tripId/location")
  async recordLocation(
    @Param("tripId") tripId: string,
    @Body() location: LocationDto,
  ) {
    const recorded = await this.database
      .query<{ id: string; trip_id: string; latitude: string; longitude: string; accuracy_meters: string | null; recorded_at: string }>(
        `INSERT INTO trip_locations (trip_id, latitude, longitude, accuracy_meters)
         VALUES ($1, $2, $3, $4)
         RETURNING id, trip_id, latitude, longitude, accuracy_meters, recorded_at`,
        [
          tripId,
          location.latitude,
          location.longitude,
          location.accuracyMeters ?? null,
        ],
      )
      .then((result) => result.rows[0]);

    // Find trip route_id for targeted room broadcast
    const trip = await this.database
      .query<{ route_id: string }>(`SELECT route_id FROM trips WHERE id = $1 LIMIT 1`, [tripId])
      .then((res) => res.rows[0]);

    // Invalidate activeTrips in-memory cache
    this.cachedActiveTrips = null;

    // Instant WebSocket broadcast (Zero latency)
    this.shuttleGateway.broadcastLocationUpdate({
      tripId,
      routeId: trip?.route_id,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracyMeters: location.accuracyMeters ?? null,
      recordedAt: recorded.recorded_at,
    });

    return recorded;
  }

  @Public()
  @Get("trips/:tripId/location")
  latestLocation(@Param("tripId") tripId: string) {
    return this.database
      .query(
        `SELECT id, trip_id, latitude, longitude, accuracy_meters, recorded_at
         FROM trip_locations WHERE trip_id = $1
         ORDER BY recorded_at DESC LIMIT 1`,
        [tripId],
      )
      .then((result) => result.rows[0] ?? null);
  }
}
