import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: 'student' | 'driver' | 'admin';
  email: string | null;
  universityId: string | null;
  fullName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'local-development-secret-change-me'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      universityId: payload.universityId,
      fullName: payload.fullName,
    };
  }
}

