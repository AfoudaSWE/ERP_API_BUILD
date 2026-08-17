import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

interface SalesChartProps {
  data: ChartData;
  title: string;
  type?: "area" | "bar" | "pie";
  locale: "ar" | "en";
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  locale: "ar" | "en";
}

function ChartTooltip({ active, payload, label, locale }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-navy-200 bg-white p-3 shadow-lg dark:border-navy-700 dark:bg-navy-800">
      <p className="mb-2 text-sm font-medium text-navy-700 dark:text-navy-200">
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-navy-600 dark:text-navy-300">
            {formatCurrency(
              entry.value,
              "EGP",
              locale === "ar" ? "ar-EG" : "en-EG",
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SalesChart({
  data,
  title,
  type = "area",
  locale,
}: SalesChartProps) {
  const chartData = useMemo(() => {
    return data.labels.map((label, index) => {
      const point: Record<string, string | number> = { name: label };
      data.datasets.forEach((dataset) => {
        point[dataset.label] = dataset.data[index];
      });
      return point;
    });
  }, [data]);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const hasData = data.datasets.some((dataset) =>
    dataset.data.some((value) => Number.isFinite(value) && value !== 0),
  );

  if (!hasData) {
    return (
      <section className="card">
        <div className="card-header">
          <h3 className="font-semibold text-navy-900 dark:text-white">{title}</h3>
        </div>
        <div className="empty-state py-10">
          <h4 className="empty-state-title">
            {locale === "ar" ? "لا توجد بيانات بعد" : "No data yet"}
          </h4>
          <p className="empty-state-description">
            {locale === "ar"
              ? "سيظهر هذا التحليل عند توفر معاملات ضمن الفترة المحددة."
              : "This analysis will appear when transactions exist for the selected period."}
          </p>
        </div>
      </section>
    );
  }

  if (type === "pie") {
    const pieData = data.labels.map((label, index) => ({
      name: label,
      value: data.datasets[0].data[index],
    }));

    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-navy-900 dark:text-white">
            {title}
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip locale={locale} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.slice(0, 6).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-navy-600 dark:text-navy-300 truncate">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-navy-900 dark:text-white">
            {title}
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={formatValue}
                />
                <Tooltip content={<ChartTooltip locale={locale} />} />
                {data.datasets.map((dataset, index) => (
                  <Bar
                    key={dataset.label}
                    dataKey={dataset.label}
                    fill={dataset.color || COLORS[index]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-navy-900 dark:text-white">{title}</h3>
      </div>
      <div className="card-body">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={formatValue}
              />
              <Tooltip content={<ChartTooltip locale={locale} />} />
              {data.datasets.map((dataset, index) => (
                <Area
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={dataset.color || COLORS[index]}
                  strokeWidth={2}
                  fill={dataset.color || COLORS[index]}
                  fillOpacity={0.08}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          {data.datasets.map((dataset, index) => (
            <div key={dataset.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: dataset.color || COLORS[index] }}
              />
              <span className="text-sm text-navy-600 dark:text-navy-300">
                {dataset.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
