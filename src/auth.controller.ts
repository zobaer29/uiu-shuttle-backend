import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Throttle } from "@nestjs/throttler";
import { IsString, MinLength } from "class-validator";
import { compare } from "bcryptjs";
import { DatabaseService } from "./database.service";
import { Public } from "./auth/roles.decorator";

class LoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  async login(@Body() credentials: LoginDto) {
    const result = await this.database.query<{
      id: string;
      role: "student" | "driver" | "admin";
      full_name: string;
      email: string | null;
      university_id: string | null;
      password_hash: string | null;
    }>(
      `SELECT id, role, full_name, email, university_id, password_hash
       FROM app_users
       WHERE (university_id = $1 OR email = $1)
         AND status = 'active'
       LIMIT 1`,
      [credentials.username.trim()],
    );

    const user = result.rows[0];
    if (!user?.password_hash || !(await compare(credentials.password, user.password_hash))) {
      throw new HttpException("Invalid username or password", HttpStatus.UNAUTHORIZED);
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
}
