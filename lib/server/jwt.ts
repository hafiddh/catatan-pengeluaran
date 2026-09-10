import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export type TokenType = 'access' | 'refresh';

export type AppClaims = JWTPayload & {
  user: AuthUser;
  token_type: TokenType;
};

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signToken(
  secret: string,
  user: AuthUser,
  tokenType: TokenType,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ user, token_type: tokenType })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(encodeSecret(secret));
}

export async function verifyToken(
  secret: string,
  token: string,
  expectedType: TokenType,
): Promise<AppClaims> {
  const { payload } = await jwtVerify(token, encodeSecret(secret), { algorithms: ['HS256'] });
  const claims = payload as AppClaims;
  if (claims.token_type !== expectedType) {
    throw new Error(`unexpected token type: ${claims.token_type}`);
  }
  return claims;
}
