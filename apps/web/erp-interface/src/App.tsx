import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Dashboard from "@/app/page";
import AccountingPage from "@/app/accounting/page";
import AttendancePage from "@/app/attendance/page";
import AttendancePortal, {
  AttendancePortalLogin,
} from "@/app/attendance-portal/page";
import BranchesPage from "@/app/branches/page";
import BrandsPage from "@/app/brands/page";
import CashBanksPage from "@/app/cash-banks/page";
import CategoriesPage from "@/app/categories/page";
import CRMPage from "@/app/crm/page";
import ContactsPage from "@/app/crm/contacts/page";
import PipelinePage from "@/app/crm/pipeline/page";
import CampaignsPage from "@/app/crm/campaigns/page";
import CustomerFeedbackPage from "@/app/crm/feedback/page";
import CustomerAnalyticsPage from "@/app/crm/analytics/page";
import CustomersPage from "@/app/customers/page";
import ExpensesPage from "@/app/expenses/page";
import ExpenseCategoriesPage from "@/app/expenses/categories/page";
import TaxRatesPage from "@/app/finance/tax-rates/page";
import BudgetsPage from "@/app/finance/budgets/page";
import PaymentsPage from "@/app/finance/payments/page";
import CashflowPage from "@/app/finance/cashflow/page";
import HelpPage from "@/app/help/page";
import HRPage from "@/app/hr/page";
import DesignationsPage from "@/app/hr/designations/page";
import LeavesPage from "@/app/hr/leaves/page";
import LeaveTypesPage from "@/app/hr/leave-types/page";
import HolidaysPage from "@/app/hr/holidays/page";
import RecruitmentPage from "@/app/hr/recruitment/page";
import PerformancePage from "@/app/hr/performance/page";
import TrainingPage from "@/app/hr/training/page";
import HrAnalyticsPage from "@/app/hr/analytics/page";
import InventoryPage from "@/app/inventory/page";
import StockAdjustmentPage from "@/app/inventory/stock-adjustment/page";
import StockTransferPage from "@/app/inventory/stock-transfer/page";
import NotificationsPage from "@/app/notifications/page";
import PayrollPage from "@/app/payroll/page";
import POSPage from "@/app/pos/page";
import PosOrdersPage from "@/app/pos/orders/page";
import BarcodePrintPage from "@/app/pos/barcode-print/page";
import QrCodePrintPage from "@/app/pos/qr-print/page";
import ProductsPage from "@/app/products/page";
import PurchasesPage from "@/app/purchases/page";
import PurchaseReturnsPage from "@/app/purchases/returns/page";
import ReportsPage from "@/app/reports/page";
import SalesPage from "@/app/sales/page";
import NewSalesInvoicePage from "@/app/sales/new-page";
import SalesQuotesPage from "@/app/sales/quotes/page";
import RecurringInvoicesPage from "@/app/sales/recurring/page";
import InvoiceTemplatesPage from "@/app/sales/templates/page";
import DeliveryNotesPage from "@/app/sales/delivery-notes/page";
import SalesReturnsPage from "@/app/sales/returns/page";
import CashSalesPage from "@/app/sales/cash-sales/page";
import SettingsPage from "@/app/settings/page";
import SuppliersPage from "@/app/suppliers/page";
import UnitsPage from "@/app/units/page";
import WarehousesPage from "@/app/warehouses/page";
import NotFound from "@/app/not-found";
import ErrorPage from "@/app/error";
import { AccountingRoutePage } from "@/components/shared/AccountingRoutePage";
import { EntityRoutePage } from "@/components/shared/EntityRoutePage";
import { OperationsPage } from "@/components/shared/OperationsPage";
import { ReportRoutePage } from "@/components/shared/ReportRoutePage";
import { SettingsSectionPage } from "@/components/shared/SettingsSectionPage";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import PlatformAdminPage from "@/app/platform-admin/page";
import { useAuth } from "@/lib/auth";
import { ApiDataProvider } from "@/lib/api-data";
import RolesPage from "@/app/settings/roles-page";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";

function PermissionRoute({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  const { t } = useTranslation();
  if (can(permission)) return children;
  return (
    <AppLayout>
      <div className="card p-10 text-center">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
          403 — {t("auth.permissionDenied")}
        </h1>
        <p className="mt-2 text-navy-500">
          {t("auth.missingPermission", { permission })}
        </p>
      </div>
    </AppLayout>
  );
}

function HomeRoute() {
  const { can } = useAuth();
  if (can("dashboard.read")) return <Dashboard />;
  if (can("pos.use")) return <Navigate to="/pos" replace />;
  return (
    <PermissionRoute permission="dashboard.read">
      <Dashboard />
    </PermissionRoute>
  );
}

function segments(value?: string) {
  return value ? value.split("/").filter(Boolean) : [];
}

function EntityRoute({
  module,
}: {
  module:
    "sales" | "purchases" | "products" | "customers" | "suppliers" | "expenses";
}) {
  const { "*": slug } = useParams();
  return <EntityRoutePage module={module} segments={segments(slug)} />;
}

function InventoryRoute() {
  const { "*": slug } = useParams();
  const route = segments(slug);
  return (
    <EntityRoutePage
      module="inventory"
      segments={route[0] === "products" ? route.slice(1) : route}
    />
  );
}

function CRMRoute() {
  const { "*": slug } = useParams();
  const route = segments(slug);
  return (
    <EntityRoutePage
      module="leads"
      segments={route[0] === "leads" ? route.slice(1) : route}
    />
  );
}

function HRRoute() {
  return <HRPage />;
}

function AccountingRoute() {
  const { "*": slug } = useParams();
  return <AccountingRoutePage slug={segments(slug)} />;
}

function ReportRoute() {
  const { "*": slug } = useParams();
  return <ReportRoutePage slug={segments(slug)} />;
}

function SettingsRoute() {
  const { section = "" } = useParams();
  return <SettingsSectionPage section={section} />;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          error={this.state.error}
          reset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        {t("auth.loadingSession")}
      </div>
    );
  if (!user)
    return (
      <Routes>
        <Route path="/attendance-portal" element={<AttendancePortalLogin />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  if (user.role === "employee")
    return (
      <AppErrorBoundary>
        <Routes>
          <Route path="/attendance-portal" element={<AttendancePortal />} />
          <Route path="*" element={<Navigate to="/attendance-portal" replace />} />
        </Routes>
      </AppErrorBoundary>
    );
  if (user.role === "super_admin")
    return (
      <AppErrorBoundary>
        <ApiDataProvider>
          <Routes>
            <Route path="/platform-admin" element={<PlatformAdminPage />} />
            <Route path="*" element={<Navigate to="/platform-admin" replace />} />
          </Routes>
        </ApiDataProvider>
      </AppErrorBoundary>
    );
  return (
    <AppErrorBoundary>
      <ApiDataProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route
            path="/accounting"
            element={
              <PermissionRoute permission="accounting.read">
                <AccountingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/accounting/*"
            element={
              <PermissionRoute permission="accounting.read">
                <AccountingRoute />
              </PermissionRoute>
            }
          />
          <Route path="/attendance-portal" element={<AttendancePortal />} />
          <Route
            path="/attendance"
            element={
              user.permissions.some((p) =>
                [
                  "attendance.records.view",
                  "attendance.manage",
                  "attendance.write",
                ].includes(p),
              ) ? (
                <AttendancePage />
              ) : (
                <PermissionRoute permission="attendance.records.view">
                  <AttendancePage />
                </PermissionRoute>
              )
            }
          />
          <Route
            path="/branches"
            element={
              <PermissionRoute permission="branches.read">
                <BranchesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/cash-banks"
            element={
              <PermissionRoute permission="cash.read">
                <CashBanksPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm"
            element={
              <PermissionRoute permission="crm.read">
                <CRMPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/contacts"
            element={
              <PermissionRoute permission="crm.read">
                <ContactsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/pipeline"
            element={
              <PermissionRoute permission="crm.read">
                <PipelinePage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/campaigns"
            element={
              <PermissionRoute permission="crm.read">
                <CampaignsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/feedback"
            element={
              <PermissionRoute permission="crm.read">
                <CustomerFeedbackPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/analytics"
            element={
              <PermissionRoute permission="crm.read">
                <CustomerAnalyticsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/crm/*"
            element={
              <PermissionRoute permission="crm.read">
                <CRMRoute />
              </PermissionRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PermissionRoute permission="customers.read">
                <CustomersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/customers/*"
            element={
              <PermissionRoute permission="customers.read">
                <EntityRoute module="customers" />
              </PermissionRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <PermissionRoute permission="expenses.read">
                <ExpensesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/expenses/categories"
            element={
              <PermissionRoute permission="expenses.read">
                <ExpenseCategoriesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/expenses/*"
            element={
              <PermissionRoute permission="expenses.read">
                <EntityRoute module="expenses" />
              </PermissionRoute>
            }
          />
          <Route
            path="/finance/tax-rates"
            element={
              <PermissionRoute permission="accounting.read">
                <TaxRatesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/finance/budgets"
            element={
              <PermissionRoute permission="accounting.read">
                <BudgetsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/finance/payments"
            element={
              <PermissionRoute permission="expenses.read">
                <PaymentsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/finance/cashflow"
            element={
              <PermissionRoute permission="accounting.read">
                <CashflowPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/help"
            element={
              <PermissionRoute permission="help.read">
                <HelpPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr"
            element={
              <PermissionRoute permission="hr.read">
                <HRPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/designations"
            element={
              <PermissionRoute permission="hr.read">
                <DesignationsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/leaves"
            element={
              <PermissionRoute permission="hr.read">
                <LeavesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/leave-types"
            element={
              <PermissionRoute permission="hr.read">
                <LeaveTypesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/holidays"
            element={
              <PermissionRoute permission="hr.read">
                <HolidaysPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/recruitment"
            element={
              <PermissionRoute permission="hr.read">
                <RecruitmentPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/performance"
            element={
              <PermissionRoute permission="hr.read">
                <PerformancePage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/training"
            element={
              <PermissionRoute permission="hr.read">
                <TrainingPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/analytics"
            element={
              <PermissionRoute permission="hr.read">
                <HrAnalyticsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/hr/*"
            element={
              <PermissionRoute permission="hr.read">
                <HRRoute />
              </PermissionRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PermissionRoute permission="inventory.read">
                <InventoryPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/inventory/stock-adjustment"
            element={
              <PermissionRoute permission="inventory.adjust">
                <StockAdjustmentPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/inventory/stock-transfer"
            element={
              <PermissionRoute permission="inventory.transfer">
                <StockTransferPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/inventory/*"
            element={
              <PermissionRoute permission="inventory.read">
                <InventoryRoute />
              </PermissionRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <PermissionRoute permission="products.read">
                <CategoriesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/brands"
            element={
              <PermissionRoute permission="products.read">
                <BrandsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/units"
            element={
              <PermissionRoute permission="products.read">
                <UnitsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/warehouses"
            element={
              <PermissionRoute permission="inventory.read">
                <WarehousesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PermissionRoute permission="notifications.read">
                <NotificationsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <PermissionRoute permission="payroll.read">
                <PayrollPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <PermissionRoute permission="pos.use">
                <POSPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/pos/orders"
            element={
              <PermissionRoute permission="pos.use">
                <PosOrdersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/pos/barcode-print"
            element={
              <PermissionRoute permission="pos.use">
                <BarcodePrintPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/pos/qr-print"
            element={
              <PermissionRoute permission="pos.use">
                <QrCodePrintPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PermissionRoute permission="products.read">
                <ProductsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/products/*"
            element={
              <PermissionRoute permission="products.read">
                <EntityRoute module="products" />
              </PermissionRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <PermissionRoute permission="purchases.read">
                <PurchasesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/purchases/returns"
            element={
              <PermissionRoute permission="purchases.read">
                <PurchaseReturnsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/purchases/*"
            element={
              <PermissionRoute permission="purchases.read">
                <EntityRoute module="purchases" />
              </PermissionRoute>
            }
          />
          <Route
            path="/purchasing/suppliers"
            element={<Navigate to="/suppliers" replace />}
          />
          <Route
            path="/reports"
            element={
              <PermissionRoute permission="reports.read">
                <ReportsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/reports/*"
            element={
              <PermissionRoute permission="reports.read">
                <ReportRoute />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <PermissionRoute permission="sales.read">
                <SalesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/new"
            element={
              <PermissionRoute permission="sales.write">
                <NewSalesInvoicePage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/quotes"
            element={
              <PermissionRoute permission="sales.read">
                <SalesQuotesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/recurring"
            element={
              <PermissionRoute permission="sales.read">
                <RecurringInvoicesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/templates"
            element={
              <PermissionRoute permission="sales.read">
                <InvoiceTemplatesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/delivery-notes"
            element={
              <PermissionRoute permission="sales.read">
                <DeliveryNotesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/returns"
            element={
              <PermissionRoute permission="sales.read">
                <SalesReturnsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/cash-sales"
            element={
              <PermissionRoute permission="sales.read">
                <CashSalesPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/sales/*"
            element={
              <PermissionRoute permission="sales.read">
                <EntityRoute module="sales" />
              </PermissionRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PermissionRoute permission="settings.read">
                <SettingsPage />
              </PermissionRoute>
            }
          />
          <Route path="/settings/roles" element={<RolesPage />} />
          <Route
            path="/settings/:section"
            element={
              <PermissionRoute permission="settings.read">
                <SettingsRoute />
              </PermissionRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <PermissionRoute permission="suppliers.read">
                <SuppliersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/suppliers/*"
            element={
              <PermissionRoute permission="suppliers.read">
                <EntityRoute module="suppliers" />
              </PermissionRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ApiDataProvider>
    </AppErrorBoundary>
  );
}
