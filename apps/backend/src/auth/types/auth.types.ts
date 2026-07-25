export interface OAuthUser {
    email: string;
    fullName: string;
    providerId: string;
}

export interface JwtPayload {
    sub: string;
    email: string;
}