import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Dashboard from "@/app/page";
import AccountingPage from "@/app/accounting/page";
import AttendancePage from "@/app/attendance/page";
import AttendancePortal, {
  AttendancePortalLogin,
} from "@/app/attendance-portal/page";
import BranchesPage from "@/app/branches/page";
import CashBanksPage from "@/app/cash-banks/page";
import CRMPage from "@/app/crm/page";
import CustomersPage from "@/app/customers/page";
import ExpensesPage from "@/app/expenses/page";
import HelpPage from "@/app/help/page";
import HRPage from "@/app/hr/page";
import InventoryPage from "@/app/inventory/page";
import NotificationsPage from "@/app/notifications/page";
import PayrollPage from "@/app/payroll/page";
import POSPage from "@/app/pos/page";
import ProductsPage from "@/app/products/page";
import PurchasesPage from "@/app/purchases/page";
import ReportsPage from "@/app/reports/page";
import SalesPage from "@/app/sales/page";
import NewSalesInvoicePage from "@/app/sales/new-page";
import SettingsPage from "@/app/settings/page";
import SuppliersPage from "@/app/suppliers/page";
import NotFound from "@/app/not-found";
import ErrorPage from "@/app/error";
import { AccountingRoutePage } from "@/components/shared/AccountingRoutePage";
import { EntityRoutePage } from "@/components/shared/EntityRoutePage";
import { OperationsPage } from "@/components/shared/OperationsPage";
import { ReportRoutePage } from "@/components/shared/ReportRoutePage";
import { SettingsSectionPage } from "@/components/shared/SettingsSectionPage";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
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
  return (
    <AppErrorBoundary>
      <ApiDataProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
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
            path="/expenses/*"
            element={
              <PermissionRoute permission="expenses.read">
                <EntityRoute module="expenses" />
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
            path="/inventory/*"
            element={
              <PermissionRoute permission="inventory.read">
                <InventoryRoute />
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
