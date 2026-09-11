import { OAuth2Client } from 'google-auth-library';
import type { AuthUser } from './jwt';

export async function verifyGoogleCredential(
  credential: string,
  clientId: string,
): Promise<AuthUser> {
  if (!credential.trim()) {
    throw new Error('credential is empty');
  }
  if (!clientId) {
    throw new Error('google client id is not configured');
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error('google payload missing email');
  }

  return {
    id: payload.sub || payload.email,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
