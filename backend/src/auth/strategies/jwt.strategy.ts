import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { getJwtSecret } from '../../config/jwt-secret';

// Cookie name must match the one set in auth.controller.ts
// __Host- prefix requires Secure flag, which browsers reject over plain HTTP
const IS_PROD = process.env.NODE_ENV === 'production';
const AUTH_COOKIE_NAME = IS_PROD ? '__Host-access_token' : 'access_token';

/**
 * Extracts the JWT from the HttpOnly cookie OR from the Authorization header.
 * Cookie takes priority (used by browser clients).
 * Bearer header fallback is used for API clients (e.g., the worker or Swagger).
 */
function cookieOrBearerExtractor(req: Request): string | null {
  if (req?.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  // Fallback to Bearer token for API/server-to-server calls
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'], // Only accept HS256 — explicitly reject 'none' algorithm
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    // Verify the session is still active in the database (invalidated on logout)
    const session = await this.authService.validateSession(
      payload.tenantId,
      payload.sub,
      payload.sessionToken,
    );

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return payload;
  }
}
