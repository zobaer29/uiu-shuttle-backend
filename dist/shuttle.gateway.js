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
var ShuttleGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShuttleGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
let ShuttleGateway = ShuttleGateway_1 = class ShuttleGateway {
    server;
    logger = new common_1.Logger(ShuttleGateway_1.name);
    handleConnection(client) {
        this.logger.log(`Client connected to real-time stream: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected from real-time stream: ${client.id}`);
    }
    handleJoinRoute(client, routeId) {
        if (routeId) {
            const room = `route_${routeId}`;
            client.join(room);
            this.logger.log(`Client ${client.id} joined ${room}`);
            return { event: "joined", room };
        }
        return { event: "error", message: "routeId is required" };
    }
    handleLeaveRoute(client, routeId) {
        if (routeId) {
            const room = `route_${routeId}`;
            client.leave(room);
            this.logger.log(`Client ${client.id} left ${room}`);
            return { event: "left", room };
        }
    }
    broadcastLocationUpdate(payload) {
        if (!this.server)
            return;
        this.server.emit("shuttle:locationUpdate", payload);
        if (payload.routeId) {
            this.server.to(`route_${payload.routeId}`).emit("shuttle:locationUpdate", payload);
        }
    }
    broadcastTripStatus(payload) {
        if (!this.server)
            return;
        this.server.emit("shuttle:statusUpdate", payload);
        if (payload.routeId) {
            this.server.to(`route_${payload.routeId}`).emit("shuttle:statusUpdate", payload);
        }
    }
};
exports.ShuttleGateway = ShuttleGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ShuttleGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("joinRoute"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], ShuttleGateway.prototype, "handleJoinRoute", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("leaveRoute"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], ShuttleGateway.prototype, "handleLeaveRoute", null);
exports.ShuttleGateway = ShuttleGateway = ShuttleGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
        namespace: "/shuttle-stream",
    })
], ShuttleGateway);
//# sourceMappingURL=shuttle.gateway.js.map