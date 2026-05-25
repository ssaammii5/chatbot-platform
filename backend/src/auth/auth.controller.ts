import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request, Response } from 'express';

// Cookie name follows '__Host-' prefix convention per security skill:
// Forces browser to only send to the exact host with Secure + no Domain attribute
const AUTH_COOKIE_NAME = '__Host-access_token';

// Cookie configuration per security skill:
// - HttpOnly: prevents JS access (XSS mitigation)
// - Secure: HTTPS only (set false only in dev)
// - SameSite=Strict: CSRF mitigation (no external navigation)
// - Path=/: scoped to the whole application
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user. Returns user info; sets JWT in HttpOnly cookie.' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.register(dto);

    // Set token as HttpOnly cookie — NEVER return in JSON body
    res.cookie(AUTH_COOKIE_NAME, accessToken, COOKIE_OPTIONS);

    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in. Returns user info; sets JWT in HttpOnly cookie.' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto);

    // Set token as HttpOnly cookie — NEVER return in JSON body
    res.cookie(AUTH_COOKIE_NAME, accessToken, COOKIE_OPTIONS);

    return { user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out. Invalidates session and clears auth cookie.' })
  async logout(@Req() req: Request & { user: any }, @Res({ passthrough: true }) res: Response) {
    const user = req.user as any;
    await this.authService.logout(user.tenantId, user.sub, user.sessionToken);

    // Clear the auth cookie
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return current authenticated user info.' })
  async me(@Req() req: Request & { user: any }) {
    // Return safe, non-sensitive user info from JWT payload
    const { sub, tenantId, role } = req.user as any;
    return { id: sub, tenantId, role };
  }
}
