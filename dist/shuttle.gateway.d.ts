import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
export declare class ShuttleGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoute(client: Socket, routeId: string): {
        event: string;
        room: string;
        message?: undefined;
    } | {
        event: string;
        message: string;
        room?: undefined;
    };
    handleLeaveRoute(client: Socket, routeId: string): {
        event: string;
        room: string;
    } | undefined;
    broadcastLocationUpdate(payload: {
        tripId: string;
        routeId?: string;
        latitude: number;
        longitude: number;
        accuracyMeters?: number | null;
        recordedAt: string;
    }): void;
    broadcastTripStatus(payload: {
        tripId: string;
        routeId?: string;
        status: "active" | "completed" | "cancelled";
    }): void;
}
