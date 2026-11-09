import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "./database.service";
declare class LoginDto {
    username: string;
    password: string;
}
export declare class AuthController {
    private readonly database;
    private readonly jwtService;
    constructor(database: DatabaseService, jwtService: JwtService);
    login(credentials: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            role: "student" | "driver" | "admin";
            fullName: string;
            email: string | null;
            universityId: string | null;
        };
    }>;
}
export {};
