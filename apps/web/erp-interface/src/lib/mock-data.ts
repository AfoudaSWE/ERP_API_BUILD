import type {
  AIRecommendation, AttendanceRecord, BankAccount, Branch, BusinessHealthScore, Category,
  Company, Customer, Department, Employee, Expense, InventoryBalance, Lead, PayrollRun,
  Product, PurchaseOrder, SalesInvoice, Supplier, User, Warehouse, DashboardStats, ChartData,
} from '@/types';

// Empty-state values only. Business records must come from the authenticated API.
export const mockCompanies: Company[] = [];
export const mockBranches: Branch[] = [];
export const mockWarehouses: Warehouse[] = [];
export const mockUsers: User[] = [];
export const mockDepartments: Department[] = [];
export const mockEmployees: Employee[] = [];
export const mockCategories: Category[] = [];
export const mockProducts: Product[] = [];
export const mockCustomers: Customer[] = [];
export const mockSuppliers: Supplier[] = [];
export const mockSalesInvoices: SalesInvoice[] = [];
export const mockPurchaseOrders: PurchaseOrder[] = [];
export const mockExpenses: Expense[] = [];
export const mockBankAccounts: BankAccount[] = [];
export const mockLeads: Lead[] = [];
export const mockAIRecommendations: AIRecommendation[] = [];
export const mockAttendanceRecords: AttendanceRecord[] = [];
export const mockPayrollRuns: PayrollRun[] = [];
export const mockInventoryBalances: InventoryBalance[] = [];

export const mockDashboardStats: DashboardStats = {
  salesToday: 0,
  salesThisMonth: 0,
  salesLastMonth: 0,
  salesGrowth: 0,
  profit: 0,
  profitMargin: 0,
  cashAvailable: 0,
  bankBalance: 0,
  receivables: 0,
  payables: 0,
  expensesThisMonth: 0,
  inventoryValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  pendingOrders: 0,
  pendingPurchases: 0,
  presentEmployees: 0,
  totalEmployees: 0,
  payrollCost: 0,
  salesTarget: 0,
  salesTargetAchievement: 0,
  overdueInvoices: 0,
  overdueAmount: 0,
};

export const mockBusinessHealthScore: BusinessHealthScore = {
  overall: 0,
  sales: 0,
  cashFlow: 0,
  profitability: 0,
  inventory: 0,
  customers: 0,
  suppliers: 0,
  workforce: 0,
  factors: [],
  updatedAt: '',
};

const emptyChart: ChartData = { labels: [], datasets: [{ label: '', data: [] }] };
export const mockSalesChartData = emptyChart;
export const mockProfitChartData = emptyChart;
export const mockCashFlowChartData = emptyChart;
export const mockSalesByBranchData = emptyChart;
export const mockSalesByCategoryData = emptyChart;
export const mockTopProductsData: { name: string; nameAr: string; sales: number; quantity: number; profit: number }[] = [];
export const mockTopCustomersData: { name: string; nameAr: string; sales: number; orders: number; balance: number }[] = [];
