"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Edit2,
  XCircle,
  Trash2,
  Eye,
  CalendarClock,
  ClipboardList,
  RefreshCw,
  Droplet,
  Leaf,
  Bug,
  Search,
  FileText,
  Building2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getUserRole } from "@/lib/jwt";
import { utcToLocalCronString as formatCron } from "@/lib/cron-utils";
import { getTaskRecurrence } from "@/lib/task-recurrence-store";

import {
  TaskOut,
  ScheduleOut,
  PaginatedResponse,
  TaskStatus,
  User,
  Garden,
  Zone,
} from "@/types";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { TaskCompleteDialog } from "@/components/tasks/task-complete-dialog";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { ScheduleFormDialog } from "@/components/schedules/schedule-form-dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// Unified item type definition
export type UnifiedItem =
  | {
      kind: "TASK";
      id: string;
      createdAt: string;
      type: string;
      description?: string | null;
      taskData: TaskOut;
    }
  | {
      kind: "SCHEDULE";
      id: string;
      createdAt: string;
      type: string;
      description?: string | null;
      gardenId: string;
      gardenName?: string;
      scheduleData: ScheduleOut;
    };

const TaskTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "WATER":
      return <Droplet className="h-4 w-4 text-blue-500" />;
    case "FERTILIZE":
      return <Leaf className="h-4 w-4 text-emerald-500" />;
    case "SPRAY":
      return <Bug className="h-4 w-4 text-rose-500" />;
    case "INSPECT":
      return <Search className="h-4 w-4 text-purple-500" />;
    case "HARVEST":
      return <FileText className="h-4 w-4 text-amber-500" />;
    default:
      return <CalendarClock className="h-4 w-4 text-gray-500" />;
  }
};

const taskTypeKeyMap: Record<string, TranslationKey> = {
  WATER: "taskType.WATER",
  FERTILIZE: "taskType.FERTILIZE",
  SPRAY: "taskType.SPRAY",
  INSPECT: "taskType.INSPECT",
  HARVEST: "taskType.HARVEST",
  OTHER: "taskType.OTHER",
};

export default function TasksPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const role = getUserRole();

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [kindFilter, setKindFilter] = useState<"ALL" | "TASK" | "SCHEDULE">("ALL");
  const [gardenFilter, setGardenFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  // Dialog States for Tasks
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskOut | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<TaskOut | null>(null);

  // Dialog States for Schedule Editing
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleOut | null>(null);
  const [isScheduleEditOpen, setIsScheduleEditOpen] = useState(false);

  // Fetch Staff list for assignee name mapping
  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
  });

  // Fetch Gardens list
  const { data: gardensData } = useQuery<PaginatedResponse<Garden>>({
    queryKey: queryKeys.gardens(),
    queryFn: () => api.get("api/gardens?limit=100&offset=0").json<PaginatedResponse<Garden>>(),
  });

  const gardens = gardensData?.items ?? [];

  // Fetch Tasks
  const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useQuery<
    PaginatedResponse<TaskOut>
  >({
    queryKey: ["all_tasks", refreshTrigger],
    queryFn: () => api.get("api/tasks?limit=100&offset=0").json<PaginatedResponse<TaskOut>>(),
  });

  // Fetch Schedules across all gardens
  const { data: schedulesData, isLoading: isSchedulesLoading, refetch: refetchSchedules } = useQuery<
    UnifiedItem[]
  >({
    queryKey: ["all_schedules", gardens.map((g) => g.id).join(","), refreshTrigger],
    queryFn: async () => {
      if (gardens.length === 0) return [];
      const results: UnifiedItem[] = [];

      await Promise.all(
        gardens.map(async (garden) => {
          try {
            const list = await api
              .get(`api/gardens/${garden.id}/schedules`)
              .json<ScheduleOut[]>();
            list.forEach((sched) => {
              results.push({
                kind: "SCHEDULE",
                id: sched.id,
                createdAt: sched.created_at,
                type: sched.type,
                description: sched.description,
                gardenId: garden.id,
                gardenName: garden.name,
                scheduleData: sched,
              });
            });
          } catch {
            // Ignore garden schedule fetch error
          }
        })
      );

      return results;
    },
    enabled: gardens.length > 0,
  });

  // Combine Tasks + Schedules into unified list
  const unifiedList = useMemo<UnifiedItem[]>(() => {
    const taskItems: UnifiedItem[] = (tasksData?.items ?? []).map((t) => ({
      kind: "TASK",
      id: t.id,
      createdAt: t.created_at,
      type: t.type,
      description: t.description,
      taskData: t,
    }));

    const schedItems = schedulesData ?? [];
    return [...taskItems, ...schedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tasksData, schedulesData]);

  // Apply Frontend Filtering
  const filteredItems = useMemo(() => {
    return unifiedList.filter((item) => {
      // 1. Kind Filter
      if (kindFilter !== "ALL" && item.kind !== kindFilter) return false;

      // 2. Garden Filter
      if (gardenFilter !== "ALL") {
        if (item.kind === "SCHEDULE" && item.gardenId !== gardenFilter) return false;
        if (item.kind === "TASK" && item.taskData.garden_id !== gardenFilter) return false;
      }

      // 3. Status Filter (only applies to tasks)
      if (statusFilter !== "ALL") {
        if (item.kind === "TASK" && item.taskData.status !== statusFilter) return false;
        if (item.kind === "SCHEDULE") return false; // Hide schedules when filtering specific task status
      }

      return true;
    });
  }, [unifiedList, kindFilter, gardenFilter, statusFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    refetchTasks();
    refetchSchedules();
  }, [refetchTasks, refetchSchedules]);

  // Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      await api.put(`api/tasks/${taskId}/start`);
      toast.success("Đã bắt đầu công việc");
      handleRefresh();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Không thể bắt đầu công việc");
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.put(`api/tasks/${taskId}`, { json: { status: "CANCELLED" } });
      toast.success("Đã hủy công việc");
      handleRefresh();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Không thể hủy công việc");
    }
  };

  // Schedule Delete Action
  const handleDeleteSchedule = async (scheduleId: string, gardenId: string) => {
    try {
      await api.delete(`api/schedules/${scheduleId}`);
      toast.success("Đã xóa lịch định kỳ");
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules(gardenId) });
      handleRefresh();
    } catch {
      toast.error("Không thể xóa lịch định kỳ");
    }
  };

  const isLoading = isTasksLoading || (gardens.length > 0 && isSchedulesLoading);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("tasks.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("tasks.subtitle")}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <TaskFormDialog
            onSuccess={handleRefresh}
            trigger={
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>{t("tasks.createTask")}</span>
              </Button>
            }
          />
          {role === "OWNER" && (
            <ScheduleFormDialog
              onSuccess={handleRefresh}
              trigger={
                <Button variant="outline" className="flex items-center gap-2 border-purple-200 hover:bg-purple-50 text-purple-700">
                  <CalendarClock className="h-4 w-4 text-purple-600" />
                  <span>{t("tasks.createSchedule")}</span>
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-none border bg-card/60">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>{t("tasks.filterLabel")}</span>
          </div>

          {/* Filter: Kind */}
          <Select
            value={kindFilter}
            onValueChange={(val) => setKindFilter((val || "ALL") as "ALL" | "TASK" | "SCHEDULE")}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder={t("tasks.colKind")}>
                {kindFilter === "ALL" && t("tasks.allKinds")}
                {kindFilter === "TASK" && t("tasks.kindTask")}
                {kindFilter === "SCHEDULE" && t("tasks.kindSchedule")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("tasks.allKinds")}</SelectItem>
              <SelectItem value="TASK">{t("tasks.kindTask")}</SelectItem>
              <SelectItem value="SCHEDULE">{t("tasks.kindSchedule")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter: Garden */}
          <Select value={gardenFilter} onValueChange={(val) => setGardenFilter(val || "ALL")}>
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder={t("tasks.allGardens")}>
                {gardenFilter === "ALL"
                  ? t("tasks.allGardens")
                  : gardens.find((g) => g.id === gardenFilter)?.name || gardenFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("tasks.allGardens")}</SelectItem>
              {gardens.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter: Task Status */}
          {kindFilter !== "SCHEDULE" && (
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter((val || "ALL") as TaskStatus | "ALL")}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder={t("tasks.colStatus")}>
                  {statusFilter === "ALL" && t("tasks.allStatuses")}
                  {statusFilter === "PENDING" && t("taskStatus.PENDING")}
                  {statusFilter === "IN_PROGRESS" && t("taskStatus.IN_PROGRESS")}
                  {statusFilter === "DONE" && t("taskStatus.DONE")}
                  {statusFilter === "CANCELLED" && t("taskStatus.CANCELLED")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("tasks.allStatuses")}</SelectItem>
                <SelectItem value="PENDING">{t("taskStatus.PENDING")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("taskStatus.IN_PROGRESS")}</SelectItem>
                <SelectItem value="DONE">{t("taskStatus.DONE")}</SelectItem>
                <SelectItem value="CANCELLED">{t("taskStatus.CANCELLED")}</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto text-xs text-muted-foreground">
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {t("tasks.refresh")}
          </Button>
        </CardContent>
      </Card>

      {/* Unified Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[140px]">{t("tasks.colKind")}</TableHead>
              <TableHead className="w-[150px]">{t("tasks.colType")}</TableHead>
              <TableHead>{t("tasks.colDescription")}</TableHead>
              <TableHead className="w-[200px]">{t("tasks.colTimeSchedule")}</TableHead>
              <TableHead className="w-[160px]">{t("tasks.colAssignee")}</TableHead>
              <TableHead className="w-[130px]">{t("tasks.colStatus")}</TableHead>
              <TableHead className="w-[80px] text-right">{t("tasks.colActions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {t("tasks.loading")}
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {t("tasks.noTasks")}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                if (item.kind === "TASK") {
                  const task = item.taskData;
                  const stored = getTaskRecurrence(task.id);
                  const pattern = task.repeat_pattern || stored?.repeat_pattern || "NONE";
                  const assignee = staffList?.find((s) => s.id === task.assignee_id);

                  const statusColorMap: Record<TaskStatus, string> = {
                    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
                    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
                    DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
                  };

                  return (
                    <TableRow key={`task-${task.id}`} className="hover:bg-muted/30">
                      {/* Kind */}
                      <TableCell>
                        {pattern === "NONE" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">
                            <ClipboardList className="mr-1 h-3 w-3" />
                            {t("tasks.oneTime")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium">
                            <RefreshCw className="mr-1 h-3 w-3" />
                            {pattern === "DAILY" && t("tasks.repeatDaily")}
                            {pattern === "WEEKLY" && t("tasks.repeatWeekly")}
                            {pattern === "MONTHLY" && t("tasks.repeatMonthly")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <TaskTypeIcon type={task.type} />
                          <span>{t(taskTypeKeyMap[task.type] || "taskType.OTHER")}</span>
                        </div>
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        <div className="max-w-[280px]">
                          <p className="truncate text-sm font-medium text-foreground" title={task.description || ""}>
                            {task.description || "-"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Time / Due Date */}
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium text-foreground">
                            {task.due_date ? format(new Date(task.due_date), "dd/MM/yyyy HH:mm") : "-"}
                          </div>
                          {pattern !== "NONE" && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-800 font-semibold">
                              {t("tasks.repeatPrefix")}
                              {pattern === "DAILY" && t("taskForm.repeatDaily")}
                              {pattern === "WEEKLY" && t("taskForm.repeatWeekly")}
                              {pattern === "MONTHLY" && t("taskForm.repeatMonthly")}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Assignee */}
                      <TableCell>
                        <span className="text-sm font-medium">
                          {assignee ? (
                            assignee.full_name
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              {t("tasks.unassigned")}
                            </span>
                          )}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant="outline" className={statusColorMap[task.status]}>
                          {t(`taskStatus.${task.status}` as TranslationKey)}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>{t("staff.colActions")}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTaskToView(task);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t("tasks.viewDetails")}
                              </DropdownMenuItem>

                              {task.status === "PENDING" && (
                                <DropdownMenuItem onClick={() => handleStartTask(task.id)}>
                                  <Play className="mr-2 h-4 w-4" />
                                  {t("tasks.startTask")}
                                </DropdownMenuItem>
                              )}

                              {task.status === "IN_PROGRESS" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTaskId(task.id);
                                    setIsCompleteOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {t("tasks.completeTask")}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setTaskToEdit(task);
                                  setIsEditOpen(true);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                {t("tasks.editTask")}
                              </DropdownMenuItem>

                              {task.status !== "CANCELLED" && task.status !== "DONE" && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleCancelTask(task.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {t("tasks.cancelTask")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Render SCHEDULE Row
                const sched = item.scheduleData;
                const cronText = formatCron(sched.cron_expr);

                return (
                  <TableRow key={`sched-${sched.id}`} className="bg-purple-50/20 hover:bg-purple-50/40">
                    {/* Kind */}
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 font-semibold">
                        <RefreshCw className="mr-1 h-3 w-3" />
                        {t("tasks.kindSchedule")}
                      </Badge>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <TaskTypeIcon type={sched.type} />
                        <span>{t(taskTypeKeyMap[sched.type] || "taskType.OTHER")}</span>
                      </div>
                    </TableCell>

                    {/* Description & Scope */}
                    <TableCell>
                      <div className="max-w-[280px]">
                        <p className="truncate text-sm font-medium text-foreground" title={sched.description || ""}>
                          {sched.description || "-"}
                        </p>
                        {item.gardenName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3 text-emerald-600" />
                            <span>{item.gardenName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Frequency & Next Run */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-purple-700">{cronText}</div>
                        {sched.next_run_at && (
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(sched.next_run_at), "dd/MM/yyyy HH:mm")}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Assignee */}
                    <TableCell>
                      <span className="text-xs text-purple-700 font-medium bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                        {t("tasks.autoSystem")}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {t("tasks.scheduleActive")}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{t("tasks.scheduleActions")}</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setScheduleToEdit(sched);
                                setIsScheduleEditOpen(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              {t("tasks.editSchedule")}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteSchedule(sched.id, item.gardenId)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("tasks.deleteSchedule")}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Task Dialogs */}
      <TaskCompleteDialog
        open={isCompleteOpen}
        onOpenChange={setIsCompleteOpen}
        taskId={selectedTaskId || undefined}
        onSuccess={() => {
          setIsCompleteOpen(false);
          setSelectedTaskId(null);
          toast.success("Đã hoàn thành công việc");
          handleRefresh();
        }}
      />

      {taskToEdit && (
        <EditTaskDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          task={taskToEdit}
          onSuccess={() => {
            handleRefresh();
            setTaskToEdit(null);
          }}
        />
      )}

      {isDetailsOpen && taskToView && (
        <TaskDetailsDialog
          task={taskToView}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}

      {/* Schedule Edit Dialog */}
      {scheduleToEdit && (
        <ScheduleFormDialog
          open={isScheduleEditOpen}
          onOpenChange={setIsScheduleEditOpen}
          initialData={scheduleToEdit}
          gardenId={scheduleToEdit.garden_id}
          onSuccess={() => {
            handleRefresh();
            setScheduleToEdit(null);
          }}
        />
      )}
    </div>
  );
}
