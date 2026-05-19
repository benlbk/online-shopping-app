import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signJWT(payload: any, options: { exp: string }) {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(options.exp)
      .setIssuedAt()
      .sign(secret);
    return token;
  } catch (error) {
    throw new Error('Error signing JWT');
  }
}

export async function verifyJWT<T>(token: string): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
