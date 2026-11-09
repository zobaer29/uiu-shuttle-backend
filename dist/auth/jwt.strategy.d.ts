import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
export interface JwtPayload {
    sub: string;
    role: 'student' | 'driver' | 'admin';
    email: string | null;
    universityId: string | null;
    fullName: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        role: "student" | "driver" | "admin";
        email: string | null;
        universityId: string | null;
        fullName: string;
    }>;
}
export {};
