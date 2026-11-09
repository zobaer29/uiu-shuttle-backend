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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShuttleController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = require("fs");
const path = require("path");
const class_validator_1 = require("class-validator");
const bcryptjs_1 = require("bcryptjs");
const database_service_1 = require("./database.service");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const roles_guard_1 = require("./auth/roles.guard");
const roles_decorator_1 = require("./auth/roles.decorator");
const shuttle_gateway_1 = require("./shuttle.gateway");
class OccupancyDto {
    passengerCount;
    latitude;
    longitude;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OccupancyDto.prototype, "passengerCount", void 0);
__decorate([
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], OccupancyDto.prototype, "latitude", void 0);
__decorate([
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], OccupancyDto.prototype, "longitude", void 0);
class DriverDto {
    universityId;
    email;
    fullName;
    password;
    phone;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], DriverDto.prototype, "universityId", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], DriverDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], DriverDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], DriverDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DriverDto.prototype, "phone", void 0);
class TripDto {
    routeId;
    busId;
    driverId;
    direction;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TripDto.prototype, "routeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TripDto.prototype, "busId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TripDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(["outbound", "return"]),
    __metadata("design:type", String)
], TripDto.prototype, "direction", void 0);
class LocationDto {
    latitude;
    longitude;
    accuracyMeters;
}
__decorate([
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], LocationDto.prototype, "latitude", void 0);
__decorate([
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], LocationDto.prototype, "longitude", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ allowNaN: false, allowInfinity: false }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], LocationDto.prototype, "accuracyMeters", void 0);
class StudentLocationDto extends LocationDto {
    studentId;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StudentLocationDto.prototype, "studentId", void 0);
class BusDto {
    registrationNumber;
    displayName;
    capacity;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BusDto.prototype, "registrationNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], BusDto.prototype, "capacity", void 0);
class ScheduleDto {
    routeId;
    direction;
    departureTime;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleDto.prototype, "routeId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(["outbound", "return"]),
    __metadata("design:type", String)
], ScheduleDto.prototype, "direction", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleDto.prototype, "departureTime", void 0);
let ShuttleController = class ShuttleController {
    database;
    shuttleGateway;
    cachedActiveTrips = null;
    CACHE_TTL_MS = 5000;
    constructor(database, shuttleGateway) {
        this.database = database;
        this.shuttleGateway = shuttleGateway;
    }
    routes() {
        return this.database
            .query(`SELECT id, route_number, name, origin_name, destination_name, is_active
         FROM routes WHERE is_active = TRUE ORDER BY route_number`)
            .then((result) => result.rows);
    }
    schedules() {
        return this.database
            .query(`SELECT schedules.id, schedules.direction, schedules.departure_time,
                routes.id AS route_id, routes.name AS route_name
         FROM schedules JOIN routes ON routes.id = schedules.route_id
         WHERE schedules.is_active = TRUE
         ORDER BY schedules.departure_time`)
            .then((result) => result.rows);
    }
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
            }
            catch {
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
    getSchedulePdf(res) {
        const filePath = path.join(process.cwd(), "uploads", "time-schedule-of-shuttle-services.pdf");
        if (!fs.existsSync(filePath)) {
            throw new common_1.HttpException("Schedule PDF not found", common_1.HttpStatus.NOT_FOUND);
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="time-schedule-of-shuttle-services.pdf"');
        res.setHeader("Cache-Control", "no-cache");
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    }
    uploadSchedulePdf(file, req) {
        if (!file) {
            throw new common_1.HttpException("No PDF file provided", common_1.HttpStatus.BAD_REQUEST);
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
    async createSchedule(schedule) {
        const result = await this.database.query(`INSERT INTO schedules (route_id, direction, departure_time, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, route_id, direction, departure_time, is_active`, [schedule.routeId, schedule.direction, schedule.departureTime]);
        this.shuttleGateway.server?.emit("schedule:updated");
        return result.rows[0];
    }
    async deleteSchedule(id) {
        const result = await this.database.query(`DELETE FROM schedules WHERE id = $1 RETURNING id`, [id]);
        this.shuttleGateway.server?.emit("schedule:updated");
        return result.rows[0] ?? null;
    }
    contacts() {
        return this.database
            .query(`SELECT id, label, phone_number, description, is_emergency
         FROM service_contacts WHERE is_active = TRUE ORDER BY display_order`)
            .then((result) => result.rows);
    }
    async activeTrips() {
        const now = Date.now();
        if (this.cachedActiveTrips && now - this.cachedActiveTrips.timestamp < this.CACHE_TTL_MS) {
            return this.cachedActiveTrips.data;
        }
        const rows = await this.database
            .query(`SELECT trips.id, trips.route_id, trips.direction, trips.status, trips.started_at,
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
         ORDER BY trips.started_at DESC`)
            .then((result) => result.rows);
        this.cachedActiveTrips = { data: rows, timestamp: now };
        return rows;
    }
    drivers() {
        return this.database
            .query(`SELECT id, university_id, full_name, email, phone, status
         FROM app_users WHERE role = 'driver' ORDER BY full_name`)
            .then((result) => result.rows);
    }
    students() {
        return this.database
            .query(`SELECT id, university_id, full_name, email
         FROM app_users WHERE role = 'student' AND status = 'active'
         ORDER BY full_name`)
            .then((result) => result.rows);
    }
    studentLocation(studentId, req) {
        if (req.user?.role === "student" && req.user.id !== studentId) {
            throw new common_1.ForbiddenException("You can only access your own location data");
        }
        return this.database
            .query(`SELECT id, user_id, latitude, longitude, accuracy_meters, recorded_at
         FROM user_locations WHERE user_id = $1
         ORDER BY recorded_at DESC LIMIT 1`, [studentId])
            .then((result) => result.rows[0] ?? null);
    }
    recordStudentLocation(location, req) {
        if (req.user?.role === "student" && req.user.id !== location.studentId) {
            throw new common_1.ForbiddenException("You cannot post location on behalf of another user");
        }
        return this.database
            .query(`INSERT INTO user_locations (user_id, latitude, longitude, accuracy_meters)
         SELECT id, $2, $3, $4 FROM app_users
         WHERE id = $1 AND role = 'student' AND status = 'active'
         RETURNING id, user_id, latitude, longitude, accuracy_meters, recorded_at`, [
            location.studentId,
            location.latitude,
            location.longitude,
            location.accuracyMeters ?? null,
        ])
            .then((result) => result.rows[0] ?? null);
    }
    buses() {
        return this.database
            .query(`SELECT id, registration_number, display_name, capacity, is_active
         FROM buses ORDER BY registration_number`)
            .then((result) => result.rows);
    }
    createBus(bus) {
        return this.database
            .query(`INSERT INTO buses (registration_number, display_name, capacity)
         VALUES ($1, $2, $3)
         RETURNING id, registration_number, display_name, capacity, is_active`, [bus.registrationNumber, bus.displayName ?? null, bus.capacity])
            .then((result) => result.rows[0]);
    }
    reportSummary() {
        return this.database
            .query(`SELECT routes.name AS route_name,
                COUNT(DISTINCT trips.id)::text AS trip_count,
                COALESCE(SUM(occupancy_events.passenger_count), 0)::text AS passenger_count
         FROM routes
         LEFT JOIN trips ON trips.route_id = routes.id
         LEFT JOIN occupancy_events ON occupancy_events.trip_id = trips.id
         GROUP BY routes.id, routes.name
         ORDER BY routes.route_number`)
            .then((result) => result.rows);
    }
    async recordOccupancy(tripId, occupancy) {
        return this.database
            .query(`INSERT INTO occupancy_events
           (trip_id, event_type, passenger_count, latitude, longitude)
         VALUES ($1, 'adjusted', $2, $3, $4)
         RETURNING id, trip_id, passenger_count, recorded_at`, [
            tripId,
            occupancy.passengerCount,
            occupancy.latitude,
            occupancy.longitude,
        ])
            .then((result) => result.rows[0]);
    }
    async createDriver(driver) {
        const passwordHash = await (0, bcryptjs_1.hash)(driver.password, 12);
        return this.database
            .query(`INSERT INTO app_users (role, university_id, email, password_hash, full_name, phone, status)
         VALUES ('driver', $1, $2, $3, $4, $5, 'active')
         RETURNING id, university_id, email, full_name, phone, status`, [
            driver.universityId,
            driver.email,
            passwordHash,
            driver.fullName,
            driver.phone ?? null,
        ])
            .then((result) => result.rows[0]);
    }
    startTrip(trip, req) {
        if (req.user?.role === "driver" && req.user.id !== trip.driverId) {
            throw new common_1.ForbiddenException("Drivers can only start their own assigned trips");
        }
        return this.database
            .query(`SELECT id, route_id, bus_id, driver_id, direction, status, started_at
         FROM trips
         WHERE status = 'active' AND (bus_id = $1 OR driver_id = $2)
         ORDER BY started_at DESC LIMIT 1`, [trip.busId, trip.driverId])
            .then(async (activeResult) => {
            if (activeResult.rows[0]) {
                return activeResult.rows[0];
            }
            const newTrip = await this.database
                .query(`INSERT INTO trips (route_id, bus_id, driver_id, direction, status, started_at)
             VALUES ($1, $2, $3, $4, 'active', now())
             RETURNING id, route_id, bus_id, driver_id, direction, status, started_at`, [trip.routeId, trip.busId, trip.driverId, trip.direction])
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
    async endTrip(tripId) {
        const updated = await this.database
            .query(`UPDATE trips SET status = 'completed', ended_at = now()
         WHERE id = $1 AND status = 'active'
         RETURNING id, route_id, status, started_at, ended_at`, [tripId])
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
    async cancelTrip(tripId) {
        const updated = await this.database
            .query(`UPDATE trips SET status = 'cancelled', ended_at = now()
         WHERE id = $1 AND status = 'active'
         RETURNING id, route_id, status, started_at, ended_at`, [tripId])
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
    async recordLocation(tripId, location) {
        const recorded = await this.database
            .query(`INSERT INTO trip_locations (trip_id, latitude, longitude, accuracy_meters)
         VALUES ($1, $2, $3, $4)
         RETURNING id, trip_id, latitude, longitude, accuracy_meters, recorded_at`, [
            tripId,
            location.latitude,
            location.longitude,
            location.accuracyMeters ?? null,
        ])
            .then((result) => result.rows[0]);
        const trip = await this.database
            .query(`SELECT route_id FROM trips WHERE id = $1 LIMIT 1`, [tripId])
            .then((res) => res.rows[0]);
        this.cachedActiveTrips = null;
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
    latestLocation(tripId) {
        return this.database
            .query(`SELECT id, trip_id, latitude, longitude, accuracy_meters, recorded_at
         FROM trip_locations WHERE trip_id = $1
         ORDER BY recorded_at DESC LIMIT 1`, [tripId])
            .then((result) => result.rows[0] ?? null);
    }
};
exports.ShuttleController = ShuttleController;
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("routes"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "routes", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("schedules"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "schedules", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("schedules/pdf/info"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "getSchedulePdfInfo", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("schedules/pdf"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "getSchedulePdf", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Post)("schedules/pdf"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        limits: { fileSize: 15 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
                cb(null, true);
            }
            else {
                cb(new common_1.HttpException("Only PDF files are allowed", common_1.HttpStatus.BAD_REQUEST), false);
            }
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "uploadSchedulePdf", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Delete)("schedules/pdf"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "deleteSchedulePdf", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Post)("schedules"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ScheduleDto]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "createSchedule", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Delete)("schedules/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "deleteSchedule", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("contacts"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "contacts", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("trips/active"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "activeTrips", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Get)("drivers"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "drivers", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Get)("students"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "students", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin", "student"),
    (0, common_1.Get)("students/:studentId/location"),
    __param(0, (0, common_1.Param)("studentId")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "studentLocation", null);
__decorate([
    (0, roles_decorator_1.Roles)("student", "admin", "driver"),
    (0, common_1.Post)("students/location"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [StudentLocationDto, Object]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "recordStudentLocation", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("buses"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "buses", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Post)("buses"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BusDto]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "createBus", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Get)("reports/summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "reportSummary", null);
__decorate([
    (0, roles_decorator_1.Roles)("driver", "admin"),
    (0, common_1.Post)("trips/:tripId/occupancy"),
    __param(0, (0, common_1.Param)("tripId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, OccupancyDto]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "recordOccupancy", null);
__decorate([
    (0, roles_decorator_1.Roles)("admin"),
    (0, common_1.Post)("drivers"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DriverDto]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "createDriver", null);
__decorate([
    (0, roles_decorator_1.Roles)("driver", "admin"),
    (0, common_1.Post)("trips"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TripDto, Object]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "startTrip", null);
__decorate([
    (0, roles_decorator_1.Roles)("driver", "admin"),
    (0, common_1.Put)("trips/:tripId/end"),
    __param(0, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "endTrip", null);
__decorate([
    (0, roles_decorator_1.Roles)("driver", "admin"),
    (0, common_1.Put)("trips/:tripId/cancel"),
    __param(0, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "cancelTrip", null);
__decorate([
    (0, roles_decorator_1.Roles)("driver", "admin"),
    (0, common_1.Post)("trips/:tripId/location"),
    __param(0, (0, common_1.Param)("tripId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, LocationDto]),
    __metadata("design:returntype", Promise)
], ShuttleController.prototype, "recordLocation", null);
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, common_1.Get)("trips/:tripId/location"),
    __param(0, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShuttleController.prototype, "latestLocation", null);
exports.ShuttleController = ShuttleController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        shuttle_gateway_1.ShuttleGateway])
], ShuttleController);
//# sourceMappingURL=shuttle.controller.js.map