CREATE TYPE "DirectionMode" AS ENUM ('TOP_TO_BOTTOM_ENTRY', 'BOTTOM_TO_TOP_ENTRY');
CREATE TYPE "CrossingDirection" AS ENUM ('ENTER', 'EXIT');

CREATE TABLE "Store" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Camera" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cameraId" TEXT NOT NULL,
  "storeId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "directionMode" "DirectionMode" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "apiKeyHash" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CameraSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cameraId" UUID NOT NULL,
  "entered" INTEGER NOT NULL,
  "exited" INTEGER NOT NULL,
  "currentOccupancy" INTEGER NOT NULL,
  "activeTrackCount" INTEGER NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CameraSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreOccupancy" (
  "storeId" UUID NOT NULL,
  "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
  "totalEnteredToday" INTEGER NOT NULL DEFAULT 0,
  "totalExitedToday" INTEGER NOT NULL DEFAULT 0,
  "totalsDate" DATE NOT NULL,
  "peakOccupancyToday" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreOccupancy_pkey" PRIMARY KEY ("storeId")
);

CREATE TABLE "CrossingEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" TEXT NOT NULL,
  "cameraId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "trackId" INTEGER NOT NULL,
  "direction" "CrossingDirection" NOT NULL,
  "confidence" DOUBLE PRECISION,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrossingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");
CREATE INDEX "Store_isActive_idx" ON "Store"("isActive");
CREATE UNIQUE INDEX "Camera_cameraId_key" ON "Camera"("cameraId");
CREATE INDEX "Camera_storeId_isActive_idx" ON "Camera"("storeId", "isActive");
CREATE INDEX "Camera_lastSeenAt_idx" ON "Camera"("lastSeenAt");
CREATE INDEX "CameraSnapshot_cameraId_capturedAt_idx" ON "CameraSnapshot"("cameraId", "capturedAt" DESC);
CREATE UNIQUE INDEX "CrossingEvent_eventId_key" ON "CrossingEvent"("eventId");
CREATE INDEX "CrossingEvent_storeId_occurredAt_idx" ON "CrossingEvent"("storeId", "occurredAt");
CREATE INDEX "CrossingEvent_cameraId_occurredAt_idx" ON "CrossingEvent"("cameraId", "occurredAt");
CREATE INDEX "CrossingEvent_storeId_direction_occurredAt_idx" ON "CrossingEvent"("storeId", "direction", "occurredAt");

ALTER TABLE "Camera" ADD CONSTRAINT "Camera_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CameraSnapshot" ADD CONSTRAINT "CameraSnapshot_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreOccupancy" ADD CONSTRAINT "StoreOccupancy_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrossingEvent" ADD CONSTRAINT "CrossingEvent_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrossingEvent" ADD CONSTRAINT "CrossingEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
