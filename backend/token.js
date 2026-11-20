import { config } from "./config.js";

export async function createTokenVerifier() {
  if (!config.googleClientId || !config.ownerEmail) return async () => false;
  const { OAuth2Client } = await import("google-auth-library");
  const client = new OAuth2Client(config.googleClientId);
  return async (authorization = "") => {
    if (!authorization.startsWith("Bearer ")) return false;
    try {
      const ticket = await client.verifyIdToken({
        idToken: authorization.slice(7),
        audience: config.googleClientId,
      });
      const claims = ticket.getPayload();
      return claims?.email_verified === true && claims.email?.toLowerCase() === config.ownerEmail;
    } catch {
      return false;
    }
  };
}
