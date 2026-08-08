"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { GardenStats, HarvestStats, InventoryItem, ItemType } from "@/types";
import { GardenSelector } from "@/components/dashboard/garden-selector";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Tractor,
  PackageX,
  Activity,
  Award,
  Leaf,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: "#16a34a",
  WATCHING: "#eab308",
  SICK: "#dc2626",
  DEAD: "#6b7280",
  UNKNOWN: "#9ca3af",
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const [gardenId, setGardenId] = useState<string>("");

  // Fetch garden stats (GET /api/gardens/{garden_id}/stats)
  const { data: stats, isLoading: statsLoading } = useQuery<GardenStats>({
    queryKey: ["reports", gardenId, "stats"],
    queryFn: () => api.get(`api/gardens/${gardenId}/stats`).json(),
    enabled: !!gardenId,
  });

  // Fetch harvest stats (GET /api/gardens/{garden_id}/harvest-stats)
  const { data: harvestStats, isLoading: harvestLoading } = useQuery<HarvestStats>({
    queryKey: ["reports", gardenId, "harvest-stats"],
    queryFn: () => api.get(`api/gardens/${gardenId}/harvest-stats`).json(),
    enabled: !!gardenId,
  });

  // Fetch inventory warnings (GET /api/gardens/{garden_id}/inventory/warnings)
  const { data: inventoryWarnings } = useQuery<InventoryItem[]>({
    queryKey: ["reports", gardenId, "inventory-warnings"],
    queryFn: () => api.get(`api/gardens/${gardenId}/inventory/warnings`).json(),
    enabled: !!gardenId,
  });

  // Prepare plant status pie chart data
  const statusPieData = stats?.by_status
    ? Object.entries(stats.by_status).map(([status, count]) => ({
        name: status,
        value: count,
      })).filter(item => item.value > 0)
    : [];

  // Calculate healthy percentage
  const healthyPercentage = stats?.total_plants
    ? Math.round(((stats.by_status.HEALTHY || 0) / stats.total_plants) * 100)
    : 0;

  const invTypeKeyMap: Record<ItemType, TranslationKey> = {
    FERTILIZER: "invType.FERTILIZE",
    PESTICIDE: "invType.PESTICIDE",
    TOOL: "invType.TOOL",
    OTHER: "invType.OTHER",
  };

  const statusLabelMap: Record<string, TranslationKey> = {
    HEALTHY: "status.healthy",
    WATCHING: "status.watching",
    SICK: "status.sick",
    DEAD: "status.dead",
    UNKNOWN: "status.unknown",
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h2>
          <p className="text-muted-foreground mt-1">
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={setGardenId} />
        </div>
      </div>

      {!gardenId ? (
        <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-2">
          <Layers className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="font-medium">{t("reports.selectGardenPrompt")}</p>
          <p className="text-xs text-muted-foreground">{t("reports.selectGardenHelp")}</p>
        </div>
      ) : statsLoading || harvestLoading ? (
        <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t("reports.compiling")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reports.healthRatio")}</p>
                  <h3 className="text-3xl font-bold mt-2 text-green-600">{healthyPercentage}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.healthyCount")
                      .replace("{healthy}", String(stats?.by_status.HEALTHY || 0))
                      .replace("{total}", String(stats?.total_plants || 0))}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-950 rounded-xl">
                  <Leaf className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reports.totalYield")}</p>
                  <h3 className="text-3xl font-bold mt-2 text-emerald-700">
                    {(harvestStats?.total_kg || 0).toFixed(1)} <span className="text-base font-normal text-muted-foreground">kg</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.harvestBatches").replace("{count}", String(harvestStats?.total_records || 0))}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl">
                  <Tractor className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reports.stockWarnings")}</p>
                  <h3 className={`text-3xl font-bold mt-2 ${inventoryWarnings && inventoryWarnings.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
                    {inventoryWarnings?.length || 0}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.belowMinThreshold")}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-950 rounded-xl">
                  <PackageX className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reports.diseaseAlerts")}</p>
                  <h3 className={`text-3xl font-bold mt-2 ${stats?.alerts && stats.alerts.length > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {stats?.alerts?.length || 0}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.outbreakWarnings")}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-950 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Health & Growth Trends */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Weekly Trend Line Chart */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> {t("reports.weeklyTrendTitle")}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t("reports.weeklyTrendSub")}</p>
                </div>
              </div>

              {stats?.weekly_trend && stats.weekly_trend.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.weekly_trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="week_start"
                        tickFormatter={(val) => format(new Date(val), "MMM d")}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        labelFormatter={(val) => `${t("reports.weekStarting")} ${format(new Date(val), "MMM d, yyyy")}`}
                      />
                      <Line type="monotone" dataKey="reports" name={t("reports.careLogs")} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="sick" name={t("reports.sickPlants")} stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="watching" name={t("reports.watchingPlants")} stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  {t("reports.noWeeklyData")}
                </div>
              )}
            </div>

            {/* Health Status Pie Chart */}
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                  <Activity className="h-5 w-5 text-green-600" /> {t("reports.cropStatusTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">{t("reports.cropStatusSub")}</p>

                {statusPieData.length > 0 ? (
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                    {t("reports.noStatusData")}
                  </div>
                )}
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const count = stats?.by_status?.[status as keyof typeof stats.by_status] || 0;
                  const labelKey = statusLabelMap[status] || "status.unknown";
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground">{t(labelKey)}: <strong className="text-foreground">{count}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Harvest & Yield Performance Reports */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Season Yield Performance */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                <Calendar className="h-5 w-5 text-emerald-600" /> {t("reports.seasonYieldTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">{t("reports.seasonYieldSub")}</p>

              {harvestStats?.by_season && harvestStats.by_season.length > 0 ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={harvestStats.by_season}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="season" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(val) => [`${val} kg`, t("harvests.colYield")]} />
                      <Bar dataKey="quantity_kg" name={t("harvests.colYield")} fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                  {t("reports.noSeasonData")}
                </div>
              )}
            </div>

            {/* Quality Grade Distribution */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
                <Award className="h-5 w-5 text-amber-600" /> {t("reports.qualityTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">{t("reports.qualitySub")}</p>

              {harvestStats?.by_quality && harvestStats.by_quality.length > 0 ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={harvestStats.by_quality}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="quality" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(val) => [`${val} kg`, t("harvests.colYield")]} />
                      <Bar dataKey="quantity_kg" name={t("harvests.colYield")} fill="#d97706" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                  {t("reports.noQualityData")}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Inventory Low Stock Warnings Report */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
              <PackageX className="h-5 w-5 text-amber-600" /> {t("reports.replenishmentTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">{t("reports.replenishmentSub")}</p>

            {inventoryWarnings && inventoryWarnings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">{t("reports.colSupplyItem")}</th>
                      <th className="p-3">{t("reports.colCategory")}</th>
                      <th className="p-3">{t("reports.colCurrentStock")}</th>
                      <th className="p-3">{t("reports.colMinQty")}</th>
                      <th className="p-3">{t("reports.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventoryWarnings.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.type ? t(invTypeKeyMap[item.type] || "invType.OTHER") : "-"}
                        </td>
                        <td className="p-3 font-mono font-semibold text-red-600">{item.quantity} {item.unit}</td>
                        <td className="p-3 font-mono text-muted-foreground">{item.min_quantity} {item.unit}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200">
                            <AlertTriangle className="h-3 w-3" /> {t("reports.lowStockBadge")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-xs font-medium flex items-center gap-2">
                <Leaf className="h-4 w-4 shrink-0" />
                {t("reports.optimalStock")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
