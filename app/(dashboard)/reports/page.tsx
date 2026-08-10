"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import {
  GardenStats,
  HarvestStats,
  InventoryItem,
  ItemType,
  Plant,
  Harvest,
  TaskOut,
  User,
  PaginatedResponse,
  Zone,
} from "@/types";
import { GardenSelector } from "@/components/dashboard/garden-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { exportToCSV, CSVColumn } from "@/lib/csv-exporter";
import { getTaskRecurrence } from "@/lib/task-recurrence-store";
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
  Download,
  ClipboardList,
  Boxes,
  Sprout,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  FileSpreadsheet,
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
  const [activeTab, setActiveTab] = useState<string>("overview");

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
  const { data: warningsData } = useQuery<any>({
    queryKey: ["reports", gardenId, "inventory-warnings"],
    queryFn: () => api.get(`api/gardens/${gardenId}/inventory/warnings`).json(),
    enabled: !!gardenId,
  });

  const lowStockWarnings: InventoryItem[] = Array.isArray(warningsData)
    ? warningsData
    : warningsData?.low_stock || [];

  // Fetch plants list for reports
  const { data: plantsData, isLoading: plantsLoading } = useQuery<PaginatedResponse<Plant>>({
    queryKey: ["reports", gardenId, "plants"],
    queryFn: () => api.get(`api/gardens/${gardenId}/plants`, { searchParams: { limit: 100 } }).json(),
    enabled: !!gardenId,
  });

  // Fetch zones list
  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["reports", gardenId, "zones"],
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
    enabled: !!gardenId,
  });

  // Fetch harvests list across all plants in the garden for harvest report
  const { data: allGardenHarvests, isLoading: harvestsLoading } = useQuery<Harvest[]>({
    queryKey: ["reports", gardenId, "all-garden-harvests", plantsData?.items?.map((p) => p.id)],
    queryFn: async () => {
      const plants = plantsData?.items || [];
      if (plants.length === 0) return [];
      const results = await Promise.all(
        plants.map((plant) =>
          api
            .get(`api/plants/${plant.id}/harvests`, { searchParams: { limit: 100 } })
            .json<PaginatedResponse<Harvest>>()
            .then((res) => res.items)
            .catch(() => [])
        )
      );
      return results.flat();
    },
    enabled: !!gardenId && (activeTab === "harvests" || activeTab === "overview") && !!plantsData?.items,
  });

  // Fetch inventory items list
  const { data: inventoryResponse, isLoading: inventoryLoading } = useQuery<PaginatedResponse<InventoryItem> | InventoryItem[]>({
    queryKey: ["reports", gardenId, "inventory"],
    queryFn: () => api.get(`api/gardens/${gardenId}/inventory`, { searchParams: { limit: 100 } }).json(),
    enabled: !!gardenId && activeTab === "inventory",
  });

  const inventoryItems: InventoryItem[] = Array.isArray(inventoryResponse)
    ? inventoryResponse
    : inventoryResponse?.items || [];

  // Fetch tasks list
  const { data: tasksData, isLoading: tasksLoading } = useQuery<PaginatedResponse<TaskOut>>({
    queryKey: ["reports", gardenId, "tasks"],
    queryFn: () => api.get("api/tasks", { searchParams: { garden_id: gardenId, limit: 100 } }).json(),
    enabled: !!gardenId && activeTab === "tasks",
  });

  // Fetch staff list for assignee names
  const { data: staffList } = useQuery<User[]>({
    queryKey: ["staff", "dropdown"],
    queryFn: () => api.get("api/staff").json(),
    enabled: !!gardenId,
  });

  // Prepare plant status pie chart data
  const statusPieData = stats?.by_status
    ? Object.entries(stats.by_status)
        .map(([status, count]) => ({
          name: status,
          value: count,
        }))
        .filter((item) => item.value > 0)
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

  const taskTypeKeyMap: Record<string, TranslationKey> = {
    WATER: "taskType.WATER",
    FERTILIZE: "taskType.FERTILIZE",
    SPRAY: "taskType.SPRAY",
    INSPECT: "taskType.INSPECT",
    HARVEST: "taskType.HARVEST",
    OTHER: "taskType.OTHER",
  };

  // --- CSV Export Handlers ---

  const handleExportOverviewCSV = () => {
    if (!stats) return;
    const columns: CSVColumn<Record<string, any>>[] = [
      { header: "Chỉ số / Danh mục", accessor: (r) => r.metric },
      { header: "Giá trị", accessor: (r) => r.value },
      { header: "Ghi chú", accessor: (r) => r.note },
    ];

    const data = [
      { metric: "Tổng số cây trồng", value: stats.total_plants, note: "Cây trong khu vườn" },
      { metric: "Tỷ lệ cây khỏe mạnh", value: `${healthyPercentage}%`, note: `${stats.by_status.HEALTHY || 0} cây khỏe` },
      { metric: "Số cây đang theo dõi", value: stats.by_status.WATCHING || 0, note: "Cây cần lưu ý" },
      { metric: "Số cây bị bệnh", value: stats.by_status.SICK || 0, note: "Cây bị nhiễm bệnh" },
      { metric: "Số cây đã chết", value: stats.by_status.DEAD || 0, note: "Cây đã hỏng" },
      { metric: "Tổng sản lượng thu hoạch (kg)", value: (harvestStats?.total_kg || 0).toFixed(1), note: "Tổng kg nông sản" },
      { metric: "Số đợt thu hoạch", value: harvestStats?.total_records || 0, note: "Lượt ghi nhận" },
      { metric: "Số cảnh báo vật tư thấp", value: lowStockWarnings.length, note: "Dưới ngưỡng an toàn" },
      { metric: "Số cảnh báo bệnh dịch", value: stats.alerts?.length || 0, note: "Dịch bệnh bùng phát" },
    ];

    exportToCSV(`bao_cao_tong_quan_nha_vuon`, columns, data);
  };

  const handleExportPlantsCSV = () => {
    const plants = plantsData?.items || [];
    if (plants.length === 0) return;

    const columns: CSVColumn<Plant>[] = [
      { header: "Mã cây", accessor: (p) => p.code },
      { header: "Phân khu", accessor: (p) => zones?.find((z) => z.id === p.zone_id)?.name || "Chưa phân khu" },
      { header: "Trạng thái sức khỏe", accessor: (p) => t(statusLabelMap[p.status] || "status.unknown") },
      { header: "Vĩ độ (Latitude)", accessor: (p) => p.latitude ?? "" },
      { header: "Kinh độ (Longitude)", accessor: (p) => p.longitude ?? "" },
      { header: "Ngày tạo", accessor: (p) => format(new Date(p.created_at), "dd/MM/yyyy") },
    ];

    exportToCSV(`bao_cao_suc_khoe_cay_trong`, columns, plants);
  };

  const handleExportHarvestsCSV = () => {
    const harvests = allGardenHarvests || [];
    if (harvests.length === 0) {
      // Fallback: Export Harvest Stats Summary (by season & quality & zone) if detailed harvest logs are empty
      if (!harvestStats) return;
      const columns: CSVColumn<Record<string, any>>[] = [
        { header: "Danh mục", accessor: (r) => r.category },
        { header: "Phân loại / Vụ mùa", accessor: (r) => r.name },
        { header: "Sản lượng (kg)", accessor: (r) => r.quantity_kg },
        { header: "Số đợt thu hoạch", accessor: (r) => r.records },
      ];
      const summaryData = [
        ...(harvestStats.by_season || []).map((s) => ({
          category: "Theo vụ mùa",
          name: s.season || "Chính vụ",
          quantity_kg: s.quantity_kg,
          records: s.records,
        })),
        ...(harvestStats.by_quality || []).map((q) => ({
          category: "Theo phân loại chất lượng",
          name: q.quality || "Tiêu chuẩn",
          quantity_kg: q.quantity_kg,
          records: q.records,
        })),
        ...(harvestStats.by_zone || []).map((z) => ({
          category: "Theo phân khu",
          name: z.zone_name || "Chưa phân khu",
          quantity_kg: z.quantity_kg,
          records: z.records,
        })),
      ];
      exportToCSV(`bao_cao_thu_hoach_nong_san`, columns, summaryData);
      return;
    }

    const columns: CSVColumn<Harvest>[] = [
      {
        header: "Mã cây",
        accessor: (h) => {
          const plant = plantsData?.items?.find((p) => p.id === h.plant_id);
          return plant ? plant.code : h.plant_id.substring(0, 8);
        },
      },
      {
        header: "Phân khu",
        accessor: (h) => {
          const plant = plantsData?.items?.find((p) => p.id === h.plant_id);
          const zone = zones?.find((z) => z.id === plant?.zone_id);
          return zone ? zone.name : "Chưa phân khu";
        },
      },
      { header: "Sản lượng (kg)", accessor: (h) => h.quantity_kg },
      { header: "Phân loại chất lượng", accessor: (h) => h.quality || "Tiêu chuẩn" },
      { header: "Vụ mùa", accessor: (h) => h.season || "Chính vụ" },
      { header: "Ngày thu hoạch", accessor: (h) => format(new Date(h.harvested_at), "dd/MM/yyyy") },
    ];

    exportToCSV(`bao_cao_thu_hoach_nong_san`, columns, harvests);
  };

  const handleExportInventoryCSV = () => {
    const items = inventoryItems || [];
    if (items.length === 0) return;

    const columns: CSVColumn<InventoryItem>[] = [
      { header: "Tên vật tư / Thuốc", accessor: (i) => i.name },
      { header: "Phân loại", accessor: (i) => t(invTypeKeyMap[i.type] || "invType.OTHER") },
      { header: "Tồn kho hiện tại", accessor: (i) => i.quantity },
      { header: "Đơn vị tính", accessor: (i) => i.unit },
      { header: "Mức dự trữ tối thiểu", accessor: (i) => i.min_quantity },
      { header: "Trạng thái kho", accessor: (i) => (i.quantity <= i.min_quantity ? "Cần nhập thêm" : "An toàn") },
      { header: "Hạn sử dụng", accessor: (i) => (i.expiry_date ? format(new Date(i.expiry_date), "dd/MM/yyyy") : "N/A") },
    ];

    exportToCSV(`bao_cao_ton_kho_vat_tu`, columns, items);
  };

  const handleExportTasksCSV = () => {
    const tasks = tasksData?.items || [];
    if (tasks.length === 0) return;

    const patternMap: Record<string, string> = {
      NONE: "Một lần",
      DAILY: "Hàng ngày",
      WEEKLY: "Hàng tuần",
      MONTHLY: "Hàng tháng",
    };

    const statusMap: Record<string, string> = {
      PENDING: "Đang chờ",
      IN_PROGRESS: "Đang thực hiện",
      DONE: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };

    const columns: CSVColumn<TaskOut>[] = [
      { header: "Tên / Loại công việc", accessor: (tk) => tk.title || t(taskTypeKeyMap[tk.type] || "taskType.OTHER") },
      { header: "Loại tác vụ", accessor: (tk) => t(taskTypeKeyMap[tk.type] || "taskType.OTHER") },
      { header: "Người thực hiện", accessor: (tk) => staffList?.find((s) => s.id === tk.assignee_id)?.full_name || "Chưa phân công" },
      { header: "Tần suất lặp", accessor: (tk) => patternMap[tk.repeat_pattern || getTaskRecurrence(tk.id)?.repeat_pattern || "NONE"] || "Một lần" },
      { header: "Hạn hoàn thành", accessor: (tk) => (tk.due_date ? format(new Date(tk.due_date), "dd/MM/yyyy") : "N/A") },
      { header: "Trạng thái", accessor: (tk) => statusMap[tk.status] || tk.status },
      { header: "Mô tả / Hướng dẫn", accessor: (tk) => tk.description || "" },
      { header: "Ngày tạo", accessor: (tk) => format(new Date(tk.created_at), "dd/MM/yyyy") },
    ];

    exportToCSV(`bao_cao_cong_viec_nhan_vien`, columns, tasks);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
            {t("reports.title")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={setGardenId} />
        </div>
      </div>

      {!gardenId ? (
        <div className="flex h-[350px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed bg-slate-50/50 dark:bg-slate-900/20 gap-3">
          <Layers className="h-12 w-12 text-emerald-500/40" />
          <p className="font-semibold text-base text-slate-700 dark:text-slate-300">{t("reports.selectGardenPrompt")}</p>
          <p className="text-xs text-muted-foreground">{t("reports.selectGardenHelp")}</p>
        </div>
      ) : (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          {/* Category Tabs Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/40 p-1.5 rounded-xl border">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-xs gap-1.5 text-xs sm:text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                {t("reports.tabOverview")}
              </TabsTrigger>
              <TabsTrigger value="plants" className="data-[state=active]:bg-white data-[state=active]:shadow-xs gap-1.5 text-xs sm:text-sm font-medium">
                <Sprout className="h-4 w-4 text-green-600" />
                {t("reports.tabPlants")}
              </TabsTrigger>
              <TabsTrigger value="harvests" className="data-[state=active]:bg-white data-[state=active]:shadow-xs gap-1.5 text-xs sm:text-sm font-medium">
                <Tractor className="h-4 w-4 text-emerald-600" />
                {t("reports.tabHarvests")}
              </TabsTrigger>
              <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:shadow-xs gap-1.5 text-xs sm:text-sm font-medium">
                <Boxes className="h-4 w-4 text-amber-600" />
                {t("reports.tabInventory")}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:shadow-xs gap-1.5 text-xs sm:text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                {t("reports.tabTasks")}
              </TabsTrigger>
            </TabsList>

            {/* Dynamic Export CSV Button for Active Tab */}
            <div className="w-full sm:w-auto flex justify-end">
              {activeTab === "overview" && (
                <Button size="sm" onClick={handleExportOverviewCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs">
                  <Download className="h-4 w-4" />
                  {t("reports.exportCsv")}
                </Button>
              )}
              {activeTab === "plants" && (
                <Button size="sm" onClick={handleExportPlantsCSV} disabled={plantsLoading} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-xs">
                  <Download className="h-4 w-4" />
                  {t("reports.exportCsv")}
                </Button>
              )}
              {activeTab === "harvests" && (
                <Button size="sm" onClick={handleExportHarvestsCSV} disabled={harvestsLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs">
                  <Download className="h-4 w-4" />
                  {t("reports.exportCsv")}
                </Button>
              )}
              {activeTab === "inventory" && (
                <Button size="sm" onClick={handleExportInventoryCSV} disabled={inventoryLoading} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-xs">
                  <Download className="h-4 w-4" />
                  {t("reports.exportCsv")}
                </Button>
              )}
              {activeTab === "tasks" && (
                <Button size="sm" onClick={handleExportTasksCSV} disabled={tasksLoading} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-xs">
                  <Download className="h-4 w-4" />
                  {t("reports.exportCsv")}
                </Button>
              )}
            </div>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {statsLoading || harvestLoading ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">{t("reports.compiling")}</p>
              </div>
            ) : (
              <>
                {/* Executive Summary Metric Cards */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-xs transition-all hover:shadow-md">
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

                  <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-xs transition-all hover:shadow-md">
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

                  <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-xs transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reports.stockWarnings")}</p>
                        <h3 className={`text-3xl font-bold mt-2 ${lowStockWarnings.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
                          {lowStockWarnings.length}
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

                  <div className="rounded-xl border bg-card text-card-foreground p-5 shadow-xs transition-all hover:shadow-md">
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
                  <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-xs">
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
                  <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col justify-between">
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
              </>
            )}
          </TabsContent>

          {/* TAB 2: PLANT HEALTH REPORT */}
          <TabsContent value="plants" className="space-y-6 mt-0">
            {plantsLoading ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-sm font-medium">Đang tải báo cáo cây trồng...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Tổng số cây trồng</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{plantsData?.total || 0}</h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Cây bị bệnh (SICK)</p>
                    <h3 className="text-3xl font-bold text-red-600 mt-2">
                      {plantsData?.items?.filter((p) => p.status === "SICK").length || 0}
                    </h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Cây đang theo dõi (WATCHING)</p>
                    <h3 className="text-3xl font-bold text-amber-600 mt-2">
                      {plantsData?.items?.filter((p) => p.status === "WATCHING").length || 0}
                    </h3>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Danh sách Cây Trồng & Tình Trạng Sức Khỏe</h3>
                      <p className="text-xs text-muted-foreground">Theo dõi chi tiết sức khỏe từng cây trong vườn</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-3">Mã cây</th>
                          <th className="p-3">Phân khu</th>
                          <th className="p-3">Trạng thái sức khỏe</th>
                          <th className="p-3">Tọa độ GPS</th>
                          <th className="p-3">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {plantsData?.items && plantsData.items.length > 0 ? (
                          plantsData.items.map((plant) => (
                            <tr key={plant.id} className="hover:bg-muted/30">
                              <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{plant.code}</td>
                              <td className="p-3 text-muted-foreground">
                                {zones?.find((z) => z.id === plant.zone_id)?.name || "Chưa phân khu"}
                              </td>
                              <td className="p-3">
                                <span
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                  style={{
                                    borderColor: STATUS_COLORS[plant.status] || "#9ca3af",
                                    color: STATUS_COLORS[plant.status] || "#9ca3af",
                                    backgroundColor: `${STATUS_COLORS[plant.status]}15`,
                                  }}
                                >
                                  {t(statusLabelMap[plant.status] || "status.unknown")}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-xs text-muted-foreground">
                                {plant.latitude && plant.longitude ? `${plant.latitude.toFixed(4)}, ${plant.longitude.toFixed(4)}` : "-"}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {format(new Date(plant.created_at), "dd/MM/yyyy HH:mm")}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                              Chưa có dữ liệu cây trồng.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: HARVEST REPORT */}
          <TabsContent value="harvests" className="space-y-6 mt-0">
            {harvestsLoading ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Đang tải báo cáo thu hoạch...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                  {/* Daily Harvest Trend Chart */}
                  <div className="rounded-xl border bg-card p-6 shadow-xs">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-1 whitespace-nowrap truncate">
                      <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" /> Sản lượng theo ngày
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Theo dõi biến động sản lượng nông sản thu hoạch từng ngày</p>

                    {allGardenHarvests && allGardenHarvests.length > 0 ? (
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(() => {
                              const dateMap: Record<string, number> = {};
                              allGardenHarvests.forEach((h) => {
                                const d = format(new Date(h.harvested_at), "yyyy-MM-dd");
                                dateMap[d] = (dateMap[d] || 0) + h.quantity_kg;
                              });
                              return Object.entries(dateMap)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([d, quantity_kg]) => ({
                                  date: format(new Date(d), "dd/MM"),
                                  quantity_kg,
                                }));
                            })()}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip formatter={(val) => [`${val} kg`, "Sản lượng"]} />
                            <Bar dataKey="quantity_kg" name="Sản lượng" fill="#2563eb" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                        Chưa có dữ liệu thu hoạch theo ngày.
                      </div>
                    )}
                  </div>

                  {/* Season Yield Performance Chart */}
                  <div className="rounded-xl border bg-card p-6 shadow-xs">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-1 whitespace-nowrap truncate">
                      <Calendar className="h-5 w-5 text-emerald-600 shrink-0" /> {t("reports.seasonYieldTitle")}
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

                  {/* Quality Grade Distribution Chart */}
                  <div className="rounded-xl border bg-card p-6 shadow-xs">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-1 whitespace-nowrap truncate">
                      <Award className="h-5 w-5 text-amber-600 shrink-0" /> {t("reports.qualityTitle")}
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

                {/* Detailed Harvest Log Table */}
                <div className="rounded-xl border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-lg mb-4">Nhật Ký Đợt Thu Hoạch Chi Tiết</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-3">Ngày thu hoạch</th>
                          <th className="p-3">Mã cây / Đối tượng</th>
                          <th className="p-3">Phân khu</th>
                          <th className="p-3">Sản lượng (kg)</th>
                          <th className="p-3">Phân loại chất lượng</th>
                          <th className="p-3">Vụ mùa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allGardenHarvests && allGardenHarvests.length > 0 ? (
                          allGardenHarvests.map((harvest) => {
                            const plant = plantsData?.items?.find((p) => p.id === harvest.plant_id);
                            const zone = zones?.find((z) => z.id === plant?.zone_id);
                            const plantCode = plant ? plant.code : `Cây #${harvest.plant_id.substring(0, 8)}`;
                            return (
                              <tr key={harvest.id} className="hover:bg-muted/30">
                                <td className="p-3 font-medium">{format(new Date(harvest.harvested_at), "dd/MM/yyyy")}</td>
                                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{plantCode}</td>
                                <td className="p-3 text-muted-foreground">{zone ? zone.name : "Chưa phân khu"}</td>
                                <td className="p-3 font-bold text-emerald-600 font-mono">{harvest.quantity_kg} kg</td>
                                <td className="p-3 font-mono font-medium">
                                  {harvest.quality ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      {harvest.quality}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">{harvest.season || "Chính vụ"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">
                              Chưa ghi nhận dữ liệu đợt thu hoạch chi tiết nào cho các cây trong vườn.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: INVENTORY REPORT */}
          <TabsContent value="inventory" className="space-y-6 mt-0">
            {inventoryLoading ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-sm font-medium">Đang tải báo cáo tồn kho...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Tổng loại vật tư</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{inventoryItems?.length || 0}</h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-amber-600 uppercase">Cần bổ sung khẩn cấp</p>
                    <h3 className="text-3xl font-bold text-amber-600 mt-2">
                      {inventoryItems?.filter((i) => i.quantity <= i.min_quantity).length || 0}
                    </h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-green-600 uppercase">Tồn kho an toàn</p>
                    <h3 className="text-3xl font-bold text-green-600 mt-2">
                      {inventoryItems?.filter((i) => i.quantity > i.min_quantity).length || 0}
                    </h3>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-lg mb-4">Chi Tiết Tồn Kho & Vật Tư Nông Nghiệp</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-3">Tên vật tư / Thuốc</th>
                          <th className="p-3">Phân loại</th>
                          <th className="p-3">Tồn kho hiện tại</th>
                          <th className="p-3">Mức tối thiểu</th>
                          <th className="p-3">Trạng thái</th>
                          <th className="p-3">Hạn sử dụng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inventoryItems && inventoryItems.length > 0 ? (
                          inventoryItems.map((item) => {
                            const isLow = item.quantity <= item.min_quantity;
                            return (
                              <tr key={item.id} className="hover:bg-muted/30">
                                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{item.name}</td>
                                <td className="p-3 text-muted-foreground">
                                  {item.type ? t(invTypeKeyMap[item.type] || "invType.OTHER") : "-"}
                                </td>
                                <td className={`p-3 font-mono font-bold ${isLow ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="p-3 font-mono text-muted-foreground">{item.min_quantity} {item.unit}</td>
                                <td className="p-3">
                                  {isLow ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                      <AlertTriangle className="h-3 w-3" /> Cần nhập thêm
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                      <CheckCircle2 className="h-3 w-3" /> An toàn
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-xs text-muted-foreground">
                                  {item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "N/A"}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">
                              Chưa có dữ liệu kho vật tư.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 5: TASKS & STAFF REPORT */}
          <TabsContent value="tasks" className="space-y-6 mt-0">
            {tasksLoading ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm font-medium">Đang tải báo cáo công việc...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Tổng số công việc</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{tasksData?.total || 0}</h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-green-600 uppercase">Đã hoàn thành (DONE)</p>
                    <h3 className="text-3xl font-bold text-green-600 mt-2">
                      {tasksData?.items?.filter((t) => t.status === "DONE").length || 0}
                    </h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-blue-600 uppercase">Đang thực hiện (IN_PROGRESS)</p>
                    <h3 className="text-3xl font-bold text-blue-600 mt-2">
                      {tasksData?.items?.filter((t) => t.status === "IN_PROGRESS").length || 0}
                    </h3>
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-xs">
                    <p className="text-xs font-semibold text-amber-600 uppercase">Đang chờ (PENDING)</p>
                    <h3 className="text-3xl font-bold text-amber-600 mt-2">
                      {tasksData?.items?.filter((t) => t.status === "PENDING").length || 0}
                    </h3>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-lg mb-4">Nhật Ký Phân Công & Tiến Độ Công Việc</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-3">Tên / Loại công việc</th>
                          <th className="p-3">Người thực hiện</th>
                          <th className="p-3">Tần suất lặp</th>
                          <th className="p-3">Hạn hoàn thành</th>
                          <th className="p-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {tasksData?.items && tasksData.items.length > 0 ? (
                          tasksData.items.map((tk) => {
                            const pattern = tk.repeat_pattern || getTaskRecurrence(tk.id)?.repeat_pattern || "NONE";
                            const patternMap: Record<string, string> = {
                              NONE: "Một lần",
                              DAILY: "Hàng ngày",
                              WEEKLY: "Hàng tuần",
                              MONTHLY: "Hàng tháng",
                            };
                            const colorMap: Record<string, string> = {
                              NONE: "bg-slate-100 text-slate-600 border-slate-200",
                              DAILY: "bg-blue-100 text-blue-700 border-blue-200",
                              WEEKLY: "bg-emerald-100 text-emerald-700 border-emerald-200",
                              MONTHLY: "bg-purple-100 text-purple-700 border-purple-200",
                            };
                            return (
                              <tr key={tk.id} className="hover:bg-muted/30">
                                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                  {tk.title || t(taskTypeKeyMap[tk.type] || "taskType.OTHER")}
                                </td>
                                <td className="p-3 text-muted-foreground font-medium">
                                  {staffList?.find((s) => s.id === tk.assignee_id)?.full_name || "Chưa phân công"}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${colorMap[pattern] || colorMap.NONE}`}>
                                    {patternMap[pattern] || "Một lần"}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-muted-foreground font-mono">
                                  {tk.due_date ? format(new Date(tk.due_date), "dd/MM/yyyy HH:mm") : "-"}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                    tk.status === "DONE" ? "bg-green-100 text-green-800" :
                                    tk.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                                    tk.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {tk.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                              Chưa có dữ liệu công việc.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
