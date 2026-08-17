import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Warehouse = { id: string; code: string; name: string; nameAr: string; isActive: boolean };
type Product = { id: string; sku: string; name: string; nameAr: string; isActive: boolean };

export default function StockTransferPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([apiRequest<Warehouse[]>("/warehouses"), apiRequest<Product[]>("/products")])
        .then(([w, p]) => { setWarehouses(w); setProducts(p); })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setMessage("");
    const data = new FormData(form);
    if (data.get("fromWarehouseId") === data.get("toWarehouseId")) {
      setError(ar ? "لازم يكون المخزن المصدر مختلف عن الوجهة." : "Source and destination warehouses must differ.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/inventory/transfers", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          fromWarehouseId: data.get("fromWarehouseId"),
          toWarehouseId: data.get("toWarehouseId"),
          productId: data.get("productId"),
          quantity: String(data.get("quantity")),
          businessDate: data.get("businessDate"),
          reason: data.get("reason"),
        }),
      });
      form.reset();
      setMessage(ar ? "تم نقل المخزون بنجاح." : "Stock transferred successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
        <header className="flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold">{ar ? "نقل المخزون" : "Stock Transfer"}</h1>
            <p className="text-sm text-navy-500">{ar ? "انقل رصيد صنف بين مخزنين" : "Move a product's balance between two warehouses"}</p>
          </div>
        </header>
        {message && <div role="status" className="rounded-xl bg-primary-50 p-3 text-primary-700">{message}</div>}
        {error && <div role="alert" className="rounded-xl bg-danger-50 p-3 text-danger-700">{error}</div>}
        <form onSubmit={(e) => void submit(e)} className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              {ar ? "من مخزن" : "From warehouse"}
              <select required name="fromWarehouseId" className="select mt-1 w-full">
                <option value="">{ar ? "اختر" : "Select"}</option>
                {warehouses.filter((w) => w.isActive).map((w) => (
                  <option key={w.id} value={w.id}>{ar ? w.nameAr || w.name : w.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {ar ? "إلى مخزن" : "To warehouse"}
              <select required name="toWarehouseId" className="select mt-1 w-full">
                <option value="">{ar ? "اختر" : "Select"}</option>
                {warehouses.filter((w) => w.isActive).map((w) => (
                  <option key={w.id} value={w.id}>{ar ? w.nameAr || w.name : w.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            {ar ? "الصنف" : "Product"}
            <select required name="productId" className="select mt-1 w-full">
              <option value="">{ar ? "اختر" : "Select"}</option>
              {products.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {ar ? p.nameAr || p.name : p.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {ar ? "الكمية" : "Quantity"}
            <input required name="quantity" type="number" min="0.001" step="0.001" className="input mt-1 w-full" />
          </label>
          <label className="block text-sm">
            {ar ? "التاريخ" : "Business date"}
            <input required name="businessDate" type="date" className="input mt-1 w-full" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="block text-sm">
            {ar ? "السبب" : "Reason"}
            <textarea required name="reason" minLength={3} maxLength={500} rows={3} className="input mt-1 w-full" placeholder={ar ? "مثال: إعادة توزيع المخزون" : "e.g. rebalancing stock between branches"} />
          </label>
          <button disabled={busy} className="btn btn-primary w-full justify-center">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {ar ? "تنفيذ النقل" : "Transfer stock"}
          </button>
        </form>
      </main>
    </AppLayout>
  );
}
