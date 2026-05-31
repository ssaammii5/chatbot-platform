import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { users, authSessions } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    return this.db.withTenant(dto.tenantId, async (tx) => {
      // Check if user already exists
      const existingUser = await tx.select().from(users).where(eq(users.email, dto.email));
      if (existingUser.length > 0) {
        throw new BadRequestException('User already exists');
      }

      // Hash password using Argon2 (memory-hard, per security skill)
      const passwordHash = await argon2.hash(dto.password);

      const [newUser] = await tx.insert(users).values({
        tenantId: dto.tenantId,
        email: dto.email,
        passwordHash,
      }).returning();

      return this.generateAuthResponse(tx, newUser);
    });
  }

  async login(dto: LoginDto) {
    return this.db.withTenant(dto.tenantId, async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.email, dto.email));

      // Use same error message for missing user and wrong password to prevent user enumeration
      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
      if (!isPasswordValid) {
        // Do NOT log credentials or the provided password
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.generateAuthResponse(tx, user);
    });
  }

  /**
   * Generates auth state. Returns the signed JWT token and user info separately.
   * The controller MUST set the token as an HttpOnly cookie — it MUST NOT be
   * returned to the client in the JSON body.
   * TODO(security): Implement MFA support
   * TODO(security): Integrate leaked password detection (e.g., HaveIBeenPwned API)
   */
  private async generateAuthResponse(tx: any, user: any): Promise<{
    accessToken: string;
    user: { id: string; email: string; role: string; tenantId: string };
  }> {
    // Generate a cryptographically secure random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day session

    await tx.insert(authSessions).values({
      tenantId: user.tenantId,
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, sessionToken };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async validateSession(tenantId: string, userId: string, sessionToken: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      const [session] = await tx.select().from(authSessions).where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.token, sessionToken)
        )
      );

      if (!session || new Date() > session.expiresAt) {
        return null;
      }
      return session;
    });
  }

  /**
   * Invalidates the specific session. Must be called on logout.
   */
  async logout(tenantId: string, userId: string, sessionToken: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      await tx.delete(authSessions).where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.token, sessionToken)
        )
      );
    });
  }

  /**
   * Invalidates ALL sessions for a user. Call when password changes or account is deactivated.
   */
  async invalidateAllSessions(tenantId: string, userId: string) {
    return this.db.withTenant(tenantId, async (tx) => {
      await tx.delete(authSessions).where(
        and(
          eq(authSessions.userId, userId),
          eq(authSessions.tenantId, tenantId)
        )
      );
    });
  }
}
