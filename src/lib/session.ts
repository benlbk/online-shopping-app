import { db } from './db';

export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.userSession.deleteMany({
    where: { userId }
  });
}

export async function validateSession(userId: string, refreshToken: string): Promise<boolean> {
  const session = await db.userSession.findFirst({
    where: { userId }
  });

  if (!session) {
    return false;
  }

  return await bcrypt.compare(refreshToken, session.refreshToken);
}

export async function rotateRefreshToken(userId: string, oldToken: string): Promise<string | null> {
  const isValid = await validateSession(userId, oldToken);
  
  if (!isValid) {
    return null;
  }

  const newToken = crypto.randomBytes(64).toString('hex');
  
  await db.userSession.update({
    where: { userId },
    data: {
      refreshToken: await bcrypt.hash(newToken, 10)
    }
  });

  return newToken;
}
