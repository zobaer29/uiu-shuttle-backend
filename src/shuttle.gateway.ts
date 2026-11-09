import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/shuttle-stream",
})
export class ShuttleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ShuttleGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to real-time stream: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from real-time stream: ${client.id}`);
  }

  @SubscribeMessage("joinRoute")
  handleJoinRoute(
    @ConnectedSocket() client: Socket,
    @MessageBody() routeId: string,
  ) {
    if (routeId) {
      const room = `route_${routeId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { event: "joined", room };
    }
    return { event: "error", message: "routeId is required" };
  }

  @SubscribeMessage("leaveRoute")
  handleLeaveRoute(
    @ConnectedSocket() client: Socket,
    @MessageBody() routeId: string,
  ) {
    if (routeId) {
      const room = `route_${routeId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left ${room}`);
      return { event: "left", room };
    }
  }

  /**
   * Broadcasts real-time GPS coordinates directly to subscribed students and admins
   * eliminating 5-second HTTP polling latency.
   */
  broadcastLocationUpdate(payload: {
    tripId: string;
    routeId?: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    recordedAt: string;
  }) {
    if (!this.server) return;

    // Broadcast globally to all tracking dashboards
    this.server.emit("shuttle:locationUpdate", payload);

    // Broadcast to specific route room
    if (payload.routeId) {
      this.server.to(`route_${payload.routeId}`).emit("shuttle:locationUpdate", payload);
    }
  }

  /**
   * Broadcasts when a trip starts, ends, or is cancelled so maps update instantly.
   */
  broadcastTripStatus(payload: {
    tripId: string;
    routeId?: string;
    status: "active" | "completed" | "cancelled";
  }) {
    if (!this.server) return;
    this.server.emit("shuttle:statusUpdate", payload);
    if (payload.routeId) {
      this.server.to(`route_${payload.routeId}`).emit("shuttle:statusUpdate", payload);
    }
  }
}

