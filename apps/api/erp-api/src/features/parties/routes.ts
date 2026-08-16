import { Router } from 'express';
import { customerInputSchema, supplierInputSchema } from '@erp/contracts';
import { createCrudRouter } from '../shared/crud-router.js';

const customerRouter = createCrudRouter({
  table: 'customers', schema: customerInputSchema, searchColumns: ['code', 'name', 'name_ar', 'phone', 'email'],
  permissionBase: 'customers',
  columns: {
    code: 'code', name: 'name', nameAr: 'name_ar', type: 'type', phone: 'phone', email: 'email', address: 'address',
    city: 'city', creditLimit: 'credit_limit', paymentTerms: 'payment_terms', tags: 'tags', isActive: 'is_active',
  },
});
const supplierRouter = createCrudRouter({
  table: 'suppliers', schema: supplierInputSchema, searchColumns: ['code', 'name', 'name_ar', 'phone', 'email'],
  permissionBase: 'suppliers',
  columns: {
    code: 'code', name: 'name', nameAr: 'name_ar', type: 'type', phone: 'phone', email: 'email', address: 'address',
    city: 'city', paymentTerms: 'payment_terms', leadTime: 'lead_time', rating: 'rating', tags: 'tags', isActive: 'is_active',
  },
});

export const partiesRouter = Router();
partiesRouter.use('/customers', customerRouter);
partiesRouter.use('/suppliers', supplierRouter);
