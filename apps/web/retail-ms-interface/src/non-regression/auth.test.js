import { describe, expect, it } from 'vitest';
import { authenticate, INVALID_CREDENTIALS_MESSAGE } from '../services/authService';
import { speakWelcome } from '../utils/speech';

describe('mock Retail authentication', () => {
  it('returns only safe Admin session information', async () => {
    const session = await authenticate({ email: 'ADMIN@RETAIL.COM', password: 'Admin@123' });
    expect(session.user).toEqual(expect.objectContaining({
      id: 'usr_retail_admin',
      email: 'admin@retail.com',
      displayName: 'Retail Administrator',
      role: 'ADMIN',
    }));
    expect(session.user.permissions.length).toBeGreaterThan(0);
    expect(session.user).not.toHaveProperty('password');
    expect(JSON.stringify(session)).not.toContain('Admin@123');
  });

  it('rejects invalid credentials with the public error message', async () => {
    await expect(authenticate({ email: 'admin@retail.com', password: 'wrong' }))
      .rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it('keeps authentication usable when browser speech is unavailable', () => {
    expect(speakWelcome('Retail Administrator')).toBe(false);
  });
});
