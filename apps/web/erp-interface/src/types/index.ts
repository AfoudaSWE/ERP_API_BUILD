// ============ CORE TYPES ============

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled';
  subscriptionPlan: SubscriptionPlanType;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlanType = 'starter' | 'business' | 'professional' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionPlanType;
  name: string;
  nameAr: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  features: string[];
}

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  industry: IndustryType;
  country: string;
  currency: string;
  taxNumber?: string;
  commercialRegister?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  fiscalYearStart: number;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export type IndustryType = 
  | 'retail' | 'fashion' | 'supermarket' | 'electronics' 
  | 'pharmacy' | 'restaurant' | 'distribution' | 'wholesale'
  | 'construction' | 'furniture' | 'manufacturing' | 'services'
  | 'maintenance' | 'clinic' | 'training' | 'ecommerce' | 'other';

export interface CompanySettings {
  language: 'ar' | 'en';
  timezone: string;
  dateFormat: string;
  decimalPlaces: number;
  taxRate: number;
  taxInclusive: boolean;
  invoicePrefix: string;
  purchasePrefix: string;
  expensePrefix: string;
  showProductImages: boolean;
  allowNegativeStock: boolean;
  enablePOS: boolean;
  enableCRM: boolean;
  enableHR: boolean;
  enablePayroll: boolean;
  enableAccounting: boolean;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  code: string;
  type: 'retail' | 'wholesale' | 'warehouse' | 'office';
  address?: string;
  city?: string;
  phone?: string;
  isActive: boolean;
  isMainBranch: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  companyId: string;
  branchId?: string;
  name: string;
  nameAr: string;
  code: string;
  type: 'main' | 'transit' | 'returns' | 'damaged';
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ USER & AUTH ============

export type UserRole = 
  | 'super_admin' | 'business_owner' | 'company_admin' | 'general_manager'
  | 'branch_manager' | 'accountant' | 'finance_manager' | 'hr_manager'
  | 'payroll_officer' | 'sales_manager' | 'sales_rep' | 'purchasing_manager'
  | 'inventory_manager' | 'warehouse_employee' | 'pos_cashier' | 'crm_agent'
  | 'auditor' | 'employee';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  nameAr?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  permissions: string[];
  branchIds: string[];
  isActive: boolean;
  language: 'ar' | 'en';
  timezone: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  company: Company | null;
  branch: Branch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============ HR & EMPLOYEES ============

export interface Department {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  code: string;
  managerId?: string;
  parentId?: string;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  userId?: string;
  employeeCode: string;
  name: string;
  nameAr: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  phone?: string;
  email?: string;
  address?: string;
  departmentId?: string;
  department?: Department;
  branchId?: string;
  branch?: Branch;
  jobTitle?: string;
  jobTitleAr?: string;
  managerId?: string;
  manager?: Employee;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  hireDate: string;
  contractEndDate?: string;
  baseSalary: number;
  bankName?: string;
  bankAccountNumber?: string;
  socialInsuranceNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: { lat: number; lng: number };
  checkOutLocation?: { lat: number; lng: number };
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'holiday' | 'leave';
  workingHours?: number;
  overtimeHours?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  month: number;
  year: number;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'closed';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  processedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee?: Employee;
  baseSalary: number;
  allowances: PayrollAllowance[];
  totalAllowances: number;
  deductions: PayrollDeduction[];
  totalDeductions: number;
  overtimePay: number;
  bonus: number;
  taxAmount: number;
  socialInsurance: number;
  grossSalary: number;
  netSalary: number;
  workingDays: number;
  absentDays: number;
  overtimeHours: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollAllowance {
  name: string;
  nameAr: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

export interface PayrollDeduction {
  name: string;
  nameAr: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

// ============ PRODUCTS & INVENTORY ============

export interface Category {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  code?: string;
  parentId?: string;
  type: 'product' | 'expense' | 'service';
  image?: string;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  barcode?: string;
  name: string;
  nameAr: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  brand?: string;
  unit: string;
  type: 'product' | 'service' | 'bundle';
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minSellingPrice?: number;
  taxRate: number;
  taxInclusive: boolean;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  images: string[];
  hasVariants: boolean;
  trackBatches: boolean;
  trackSerials: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  totalStock?: number;
  availableStock?: number;
  stockValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryBalance {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  lastReceivedAt?: string;
  lastIssuedAt?: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  type: 'receipt' | 'issue' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'return';
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// ============ CUSTOMERS & SUPPLIERS ============

export interface Customer {
  id: string;
  companyId: string;
  code: string;
  name: string;
  nameAr: string;
  type: 'retail' | 'wholesale' | 'distributor' | 'corporate';
  phone?: string;
  email?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  creditLimit: number;
  paymentTerms: number;
  priceListId?: string;
  salesRepId?: string;
  salesRep?: User;
  totalSales: number;
  totalPaid: number;
  balance: number;
  lastSaleDate?: string;
  notes?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  code: string;
  name: string;
  nameAr: string;
  type: 'supplier' | 'manufacturer' | 'distributor';
  phone?: string;
  email?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  paymentTerms: number;
  leadTime: number;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  lastPurchaseDate?: string;
  rating: number;
  notes?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ SALES ============

export interface SalesInvoice {
  id: string;
  companyId: string;
  branchId: string;
  branch?: Branch;
  invoiceNumber: string;
  customerId?: string;
  customer?: Customer;
  customerName?: string;
  type: 'invoice' | 'cash_sale' | 'return' | 'credit_note';
  source?: 'erp' | 'pos' | 'ecommerce' | 'mobile_app';
  status: 'draft' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';
  invoiceDate: string;
  dueDate?: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  currency: string;
  exchangeRate: number;
  warehouseId?: string;
  warehouse?: Warehouse;
  salesRepId?: string;
  salesRep?: User;
  notes?: string;
  internalNotes?: string;
  eInvoiceStatus?: 'pending' | 'submitted' | 'accepted' | 'rejected';
  eInvoiceUuid?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  product?: Product;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  costPrice?: number;
  profit?: number;
  sortOrder: number;
  createdAt: string;
}

// ============ PURCHASING ============

export interface PurchaseOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  orderDate: string;
  expectedDate?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  warehouseId?: string;
  warehouse?: Warehouse;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  description: string;
  quantity: number;
  receivedQuantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: string;
  supplier?: Supplier;
  purchaseOrderId?: string;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  invoiceDate: string;
  dueDate?: string;
  items: PurchaseInvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  warehouseId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  product?: Product;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
}

// ============ EXPENSES ============

export interface Expense {
  id: string;
  companyId: string;
  branchId?: string;
  branch?: Branch;
  expenseNumber: string;
  categoryId?: string;
  category?: Category;
  description: string;
  amount: number;
  taxAmount: number;
  total: number;
  expenseDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'check';
  supplierId?: string;
  supplier?: Supplier;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  receiptUrl?: string;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ ACCOUNTING ============

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface LedgerAccount {
  id: string;
  companyId: string;
  code: string;
  name: string;
  nameAr: string;
  type: AccountType;
  parentId?: string;
  isActive: boolean;
  isSystemAccount: boolean;
  balance: number;
  children?: LedgerAccount[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  isAutomatic: boolean;
  createdBy?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  id: string;
  entryId: string;
  accountId: string;
  account?: LedgerAccount;
  description?: string;
  debit: number;
  credit: number;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  type: 'bank' | 'cash' | 'mobile_wallet';
  bankName?: string;
  accountNumber?: string;
  currency: string;
  balance: number;
  ledgerAccountId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ CRM ============

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  nameAr?: string;
  company?: string;
  phone?: string;
  email?: string;
  source?: 'website' | 'referral' | 'social_media' | 'cold_call' | 'exhibition' | 'other';
  status: LeadStatus;
  value?: number;
  probability: number;
  expectedCloseDate?: string;
  assignedTo?: string;
  assignedUser?: User;
  notes?: string;
  tags: string[];
  lostReason?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ POS ============

export interface POSSession {
  id: string;
  companyId: string;
  branchId: string;
  branch?: Branch;
  cashierId: string;
  cashier?: User;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalSales: number;
  totalRefunds: number;
  transactionCount: number;
  status: 'open' | 'closing' | 'closed';
  openedAt: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POSTransaction {
  id: string;
  sessionId: string;
  invoiceId: string;
  invoice?: SalesInvoice;
  type: 'sale' | 'refund';
  paymentMethod: 'cash' | 'card' | 'mobile_wallet' | 'split';
  amount: number;
  change: number;
  createdAt: string;
}

// ============ AI & ANALYTICS ============

export type RecommendationType = 'sales' | 'inventory' | 'purchasing' | 'finance' | 'hr';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AIRecommendation {
  id: string;
  companyId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  impact?: string;
  impactAr?: string;
  actionUrl?: string;
  data: Record<string, unknown>;
  status: 'active' | 'dismissed' | 'completed';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHealthScore {
  overall: number;
  sales: number;
  cashFlow: number;
  profitability: number;
  inventory: number;
  customers: number;
  suppliers: number;
  workforce: number;
  factors: HealthFactor[];
  updatedAt: string;
}

export interface HealthFactor {
  name: string;
  nameAr: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  descriptionAr: string;
}

export interface Forecast {
  id: string;
  companyId: string;
  type: 'sales' | 'cash_flow' | 'inventory' | 'expenses';
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  values: ForecastValue[];
  confidence: number;
  generatedAt: string;
}

export interface ForecastValue {
  date: string;
  expected: number;
  optimistic: number;
  pessimistic: number;
  actual?: number;
}

// ============ NOTIFICATIONS ============

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============ DASHBOARD ============

export interface DashboardStats {
  salesToday: number;
  salesThisMonth: number;
  salesLastMonth: number;
  salesGrowth: number;
  profit: number;
  profitMargin: number;
  cashAvailable: number;
  bankBalance: number;
  receivables: number;
  payables: number;
  expensesThisMonth: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingOrders: number;
  pendingPurchases: number;
  presentEmployees: number;
  totalEmployees: number;
  payrollCost: number;
  salesTarget: number;
  salesTargetAchievement: number;
  overdueInvoices: number;
  overdueAmount: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

// ============ AUDIT ============

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  user?: User;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
