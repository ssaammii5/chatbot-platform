import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getJwtSecret } from '../../config/jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'], // Only accept HS256 — reject 'none' algorithm
    });
  }

  async validate(payload: any) {
    // Verify the session is still active (not logged out or expired)
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
