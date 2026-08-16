export const QUEUE_NAMES = {
  email: 'email', media: 'media', commerceOrders: 'commerce-orders', inventory: 'inventory', reports: 'reports',
} as const;
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  sendOrderConfirmation: 'send-order-confirmation', sendPasswordReset: 'send-password-reset', sendLowStockAlert: 'send-low-stock-alert',
  processProductImage: 'process-product-image', generateImageThumbnails: 'generate-image-thumbnails', deleteUnusedMedia: 'delete-unused-media',
  processOrderCreated: 'process-order-created', processOrderCancelled: 'process-order-cancelled', synchronizeOrderWithErp: 'synchronize-order-with-erp',
  releaseExpiredReservation: 'release-expired-reservation', checkLowStock: 'check-low-stock', generateCommerceReport: 'generate-commerce-report', generateErpReport: 'generate-erp-report',
} as const;
export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];

interface ScopedPayload { companyId: string }
export interface JobPayloads {
  'send-order-confirmation': ScopedPayload & { orderId: string };
  'send-password-reset': ScopedPayload & { userId: string; resetTokenId: string };
  'send-low-stock-alert': ScopedPayload & { productId: string };
  'process-product-image': ScopedPayload & { mediaId: string; productId: string };
  'generate-image-thumbnails': ScopedPayload & { mediaId: string };
  'delete-unused-media': ScopedPayload & { mediaId: string };
  'process-order-created': ScopedPayload & { orderId: string };
  'process-order-cancelled': ScopedPayload & { orderId: string };
  'synchronize-order-with-erp': ScopedPayload & { orderId: string };
  'release-expired-reservation': ScopedPayload & { reservationId: string };
  'check-low-stock': ScopedPayload & { requestedBy: string };
  'generate-commerce-report': ScopedPayload & { reportId: string };
  'generate-erp-report': ScopedPayload & { reportId: string };
}
export interface JobResults { 'check-low-stock': { checked: number; lowStockProductIds: string[]; duplicate: boolean } }

export const QUEUE_BY_JOB: Record<JobName, QueueName> = {
  'send-order-confirmation': QUEUE_NAMES.email, 'send-password-reset': QUEUE_NAMES.email, 'send-low-stock-alert': QUEUE_NAMES.email,
  'process-product-image': QUEUE_NAMES.media, 'generate-image-thumbnails': QUEUE_NAMES.media, 'delete-unused-media': QUEUE_NAMES.media,
  'process-order-created': QUEUE_NAMES.commerceOrders, 'process-order-cancelled': QUEUE_NAMES.commerceOrders, 'synchronize-order-with-erp': QUEUE_NAMES.commerceOrders,
  'release-expired-reservation': QUEUE_NAMES.inventory, 'check-low-stock': QUEUE_NAMES.inventory,
  'generate-commerce-report': QUEUE_NAMES.reports, 'generate-erp-report': QUEUE_NAMES.reports,
};

export const REGISTERED_JOBS: readonly JobName[] = [JOB_NAMES.checkLowStock];
export const UNREGISTERED_JOBS: readonly JobName[] = Object.values(JOB_NAMES).filter((name) => !REGISTERED_JOBS.includes(name));
