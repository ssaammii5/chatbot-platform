import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { userSessions, users } from '../auth.schema';
import { JwtPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly database: DatabaseService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.cookies?.['accessToken'] || null,
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'fallback-secret-key-change-me',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        const rawToken = req.cookies?.['accessToken'];

        const session = await this.database.db.query.userSessions.findFirst({
            where: and(
                eq(userSessions.token, rawToken),
                eq(userSessions.isRevoked, 'false')
            ),
        });

        if (!session) throw new UnauthorizedException('Session terminated.');

        const user = await this.database.db.query.users.findFirst({
            where: eq(users.id, payload.sub),
        });

        if (!user) throw new UnauthorizedException('User not found.');

        return { id: user.id, email: user.email };
    }
}