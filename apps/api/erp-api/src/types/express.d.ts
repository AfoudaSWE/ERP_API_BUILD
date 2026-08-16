declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: { userId: string; tenantId: string; companyId: string; role: string; permissions: string[]; branchIds?: string[] | null };
      customerAuth?: { customerId: string; companyId: string };
    }
  }
}

export {};
