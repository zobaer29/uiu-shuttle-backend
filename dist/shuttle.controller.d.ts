import type { Response } from "express";
import { DatabaseService } from "./database.service";
import { ShuttleGateway } from "./shuttle.gateway";
declare class OccupancyDto {
    passengerCount: number;
    latitude: number;
    longitude: number;
}
declare class DriverDto {
    universityId: string;
    email: string;
    fullName: string;
    password: string;
    phone?: string;
}
declare class TripDto {
    routeId: string;
    busId: string;
    driverId: string;
    direction: "outbound" | "return";
}
declare class LocationDto {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
}
declare class StudentLocationDto extends LocationDto {
    studentId: string;
}
declare class BusDto {
    registrationNumber: string;
    displayName?: string;
    capacity: number;
}
declare class ScheduleDto {
    routeId: string;
    direction: "outbound" | "return";
    departureTime: string;
}
export declare class ShuttleController {
    private readonly database;
    private readonly shuttleGateway;
    private cachedActiveTrips;
    private readonly CACHE_TTL_MS;
    constructor(database: DatabaseService, shuttleGateway: ShuttleGateway);
    routes(): Promise<object[]>;
    schedules(): Promise<object[]>;
    getSchedulePdfInfo(): any;
    getSchedulePdf(res: Response): void;
    uploadSchedulePdf(file: Express.Multer.File, req: any): {
        url: string;
        title: string;
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
        uploadedAt: string;
        uploadedBy: any;
        success: boolean;
        message: string;
    };
    deleteSchedulePdf(): {
        success: boolean;
        message: string;
    };
    createSchedule(schedule: ScheduleDto): Promise<object>;
    deleteSchedule(id: string): Promise<object>;
    contacts(): Promise<object[]>;
    activeTrips(): Promise<any[]>;
    drivers(): Promise<object[]>;
    students(): Promise<object[]>;
    studentLocation(studentId: string, req: any): Promise<object>;
    recordStudentLocation(location: StudentLocationDto, req: any): Promise<object>;
    buses(): Promise<object[]>;
    createBus(bus: BusDto): Promise<object>;
    reportSummary(): Promise<object[]>;
    recordOccupancy(tripId: string, occupancy: OccupancyDto): Promise<object>;
    createDriver(driver: DriverDto): Promise<object>;
    startTrip(trip: TripDto, req: any): Promise<object>;
    endTrip(tripId: string): Promise<{
        id: string;
        route_id: string;
        status: "completed";
        started_at: string;
        ended_at: string;
    }>;
    cancelTrip(tripId: string): Promise<{
        id: string;
        route_id: string;
        status: "cancelled";
        started_at: string;
        ended_at: string;
    }>;
    recordLocation(tripId: string, location: LocationDto): Promise<{
        id: string;
        trip_id: string;
        latitude: string;
        longitude: string;
        accuracy_meters: string | null;
        recorded_at: string;
    }>;
    latestLocation(tripId: string): Promise<object>;
}
export {};
