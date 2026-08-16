import type { Camera, Store } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedCameraRequest extends Request {
  authenticatedCamera: Camera & { store: Store };
}

export interface TrackPosition {
  trackId: number;
  x: number;
  y: number;
  confidence: number;
}
