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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const class_validator_1 = require("class-validator");
const bcryptjs_1 = require("bcryptjs");
const database_service_1 = require("./database.service");
const roles_decorator_1 = require("./auth/roles.decorator");
class LoginDto {
    username;
    password;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
let AuthController = class AuthController {
    database;
    jwtService;
    constructor(database, jwtService) {
        this.database = database;
        this.jwtService = jwtService;
    }
    async login(credentials) {
        const result = await this.database.query(`SELECT id, role, full_name, email, university_id, password_hash
       FROM app_users
       WHERE (university_id = $1 OR email = $1)
         AND status = 'active'
       LIMIT 1`, [credentials.username.trim()]);
        const user = result.rows[0];
        if (!user?.password_hash || !(await (0, bcryptjs_1.compare)(credentials.password, user.password_hash))) {
            throw new common_1.HttpException("Invalid username or password", common_1.HttpStatus.UNAUTHORIZED);
        }
        const payload = {
            sub: user.id,
            role: user.role,
            fullName: user.full_name,
            email: user.email,
            universityId: user.university_id,
        };
        const accessToken = await this.jwtService.signAsync(payload);
        return {
            access_token: accessToken,
            user: {
                id: user.id,
                role: user.role,
                fullName: user.full_name,
                email: user.email,
                universityId: user.university_id,
            },
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map