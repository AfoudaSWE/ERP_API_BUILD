import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { CameraAuthGuard, hashCameraApiKey } from './camera-auth.guard';

const pepper = 'a-long-test-pepper';
const key = 'test-camera-key-123';

function context(request: any): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}

describe('CameraAuthGuard', () => {
  const config = { getOrThrow: () => pepper } as any;

  it('rejects an unknown camera', async () => {
    const prisma = { camera: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const guard = new CameraAuthGuard(prisma, config);
    await expect(guard.canActivate(context({ body: { cameraId: 'missing' }, header: () => key })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid API key', async () => {
    const camera = { isActive: true, store: { isActive: true }, apiKeyHash: hashCameraApiKey(key, pepper) };
    const prisma = { camera: { findUnique: jest.fn().mockResolvedValue(camera) } } as any;
    const guard = new CameraAuthGuard(prisma, config);
    await expect(guard.canActivate(context({ body: { cameraId: 'cam' }, header: () => 'wrong-key' })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates and attaches the camera without exposing the key', async () => {
    const camera = { isActive: true, store: { isActive: true }, apiKeyHash: hashCameraApiKey(key, pepper) };
    const prisma = { camera: { findUnique: jest.fn().mockResolvedValue(camera) } } as any;
    const request = { body: { cameraId: 'cam' }, header: () => key } as any;
    await expect(new CameraAuthGuard(prisma, config).canActivate(context(request))).resolves.toBe(true);
    expect(request.authenticatedCamera).toBe(camera);
  });
});
