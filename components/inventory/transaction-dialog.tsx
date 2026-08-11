"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem, PaginatedResponse, TaskOut, TaskType, TaskStatus, User } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ClipboardList, UserCheck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

// ── Localization maps ────────────────────────────────────────────────────────

const TASK_TYPE_VI: Record<TaskType, string> = {
  WATER: "Tưới nước",
  FERTILIZE: "Bón phân",
  SPRAY: "Phun thuốc",
  INSPECT: "Kiểm tra",
  HARVEST: "Thu hoạch",
  OTHER: "Khác",
};

const TASK_TYPE_ICON: Record<TaskType, string> = {
  WATER: "💧",
  FERTILIZE: "🌿",
  SPRAY: "🧴",
  INSPECT: "🔍",
  HARVEST: "🌾",
  OTHER: "📋",
};

const TASK_STATUS_VI: Record<TaskStatus, string> = {
  PENDING: "Chờ thực hiện",
  IN_PROGRESS: "Đang thực hiện",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatTaskLabel(task: TaskOut): string {
  const icon = TASK_TYPE_ICON[task.type] ?? "📋";
  const typeName = TASK_TYPE_VI[task.type] ?? task.type;
  const titlePart = task.title ? `: "${task.title}"` : "";
  const datePart = task.due_date
    ? ` — HH: ${new Date(task.due_date).toLocaleDateString("vi-VN")}`
    : "";
  return `${icon} ${typeName}${titlePart}${datePart}`;
}

// ── Form schema ───────────────────────────────────────────────────────────────

const formSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().gt(0, "Số lượng phải lớn hơn 0"),
  task_id: z.string().optional(),
  recipient_id: z.string().optional(),
  note: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

interface TransactionDialogProps {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TransactionDialog({
  item,
  onOpenChange,
  onSuccess,
}: TransactionDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tasks for this garden
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", item?.garden_id],
    queryFn: () =>
      api
        .get(`api/tasks?garden_id=${item?.garden_id}&limit=100`)
        .json<PaginatedResponse<TaskOut>>(),
    enabled: !!item?.garden_id,
  });

  // Fetch staff list (BE returns list directly, not paginated)
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("api/staff").json<User[]>(),
    enabled: !!item,
  });

  const tasks = tasksData?.items || [];
  // Only show non-done/cancelled tasks for linking (PENDING or IN_PROGRESS)
  const activeTasks = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS"
  );
  const allTasks = tasks; // show all but visually distinct

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      direction: "OUT",
      quantity: 1,
      task_id: "none",
      recipient_id: "none",
      note: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        direction: "OUT",
        quantity: 1,
        task_id: "none",
        recipient_id: "none",
        note: "",
      });
    }
  }, [item, form]);

  const onSubmit = async (values: FormValues) => {
    if (!item) return;

    // Prevent over-withdrawing
    if (values.direction === "OUT" && values.quantity > item.quantity) {
      const msg = `Không thể xuất vượt quá số lượng tồn kho hiện tại (${item.quantity} ${item.unit || ""})`;
      form.setError("quantity", { type: "manual", message: msg });
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      // Embed recipient name into note field (BE has no recipient_id field)
      let finalNote = values.note || "";
      if (values.recipient_id && values.recipient_id !== "none") {
        const recipient = staffList.find((s) => s.id === values.recipient_id);
        const recipientName = recipient ? recipient.full_name : values.recipient_id;
        finalNote = `[Người nhận: ${recipientName}] ${finalNote}`.trim();
      }

      await api.post(`api/inventory/${item.id}/transactions`, {
        json: {
          direction: values.direction,
          quantity: values.quantity,
          task_id: values.task_id && values.task_id !== "none" ? values.task_id : null,
          note: finalNote || null,
        },
      });
      toast.success("Ghi nhận giao dịch kho thành công");
      onSuccess();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || "Không thể ghi nhận giao dịch";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDirection = form.watch("direction");
  const selectedTaskId = form.watch("task_id");
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId);
  const selectedRecipientId = form.watch("recipient_id");
  const selectedRecipient = staffList.find((s) => s.id === selectedRecipientId);

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            {currentDirection === "OUT" ? (
              <ArrowUpFromLine className="h-5 w-5 text-red-500" />
            ) : (
              <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
            )}
            {currentDirection === "OUT" ? "Phiếu Xuất Kho:" : "Phiếu Nhập Kho:"}{" "}
            <span className="font-bold">{item?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Tồn kho hiện tại */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center text-sm">
              <span className="text-emerald-900 font-medium">Tồn kho hiện tại:</span>
              <span className="font-mono font-bold text-emerald-800 text-base">
                {item?.quantity} {item?.unit || ""}
              </span>
            </div>

            {/* Loại giao dịch + Số lượng */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại giao dịch</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.clearErrors("quantity");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OUT">
                          <span className="flex items-center gap-2">
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
                            Xuất kho
                          </span>
                        </SelectItem>
                        <SelectItem value="IN">
                          <span className="flex items-center gap-2">
                            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                            Nhập kho
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="0"
                          className="pr-10 border-emerald-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={field.value === 0 ? "" : field.value}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? 0 : parseFloat(val) || 0);
                            form.clearErrors("quantity");
                          }}
                        />
                        {item?.unit && (
                          <div className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none select-none">
                            {item.unit}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Công việc liên quan */}
            <FormField
              control={form.control}
              name="task_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    Gắn vào công việc (Tùy chọn)
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-emerald-200 h-auto min-h-10">
                        {selectedTask ? (
                          <div className="flex items-center gap-2 py-0.5">
                            <span>{TASK_TYPE_ICON[selectedTask.type]}</span>
                            <span className="font-medium text-sm">
                              {TASK_TYPE_VI[selectedTask.type]}
                              {selectedTask.title ? `: ${selectedTask.title}` : ""}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ml-1 ${TASK_STATUS_COLOR[selectedTask.status]}`}
                            >
                              {TASK_STATUS_VI[selectedTask.status]}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            — Không gắn công việc (xuất lẻ) —
                          </span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">— Không gắn công việc (xuất lẻ) —</span>
                      </SelectItem>
                      {/* Active tasks first */}
                      {activeTasks.length > 0 && (
                        <div className="px-2 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                          Đang hoạt động
                        </div>
                      )}
                      {activeTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex items-center gap-2">
                            <span>{TASK_TYPE_ICON[task.type]}</span>
                            <span className="font-medium">
                              {TASK_TYPE_VI[task.type]}
                              {task.title ? `: ${task.title}` : ""}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground ml-1">
                                HH: {new Date(task.due_date).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ml-auto ${TASK_STATUS_COLOR[task.status]}`}
                            >
                              {TASK_STATUS_VI[task.status]}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {/* Completed/cancelled tasks */}
                      {allTasks.filter(t => t.status === "DONE" || t.status === "CANCELLED").length > 0 && (
                        <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">
                          Đã kết thúc
                        </div>
                      )}
                      {allTasks
                        .filter((t) => t.status === "DONE" || t.status === "CANCELLED")
                        .map((task) => (
                          <SelectItem key={task.id} value={task.id} className="opacity-60">
                            <div className="flex items-center gap-2">
                              <span>{TASK_TYPE_ICON[task.type]}</span>
                              <span>
                                {TASK_TYPE_VI[task.type]}
                                {task.title ? `: ${task.title}` : ""}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs px-1.5 py-0 ml-auto ${TASK_STATUS_COLOR[task.status]}`}
                              >
                                {TASK_STATUS_VI[task.status]}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Người nhận vật tư */}
            <FormField
              control={form.control}
              name="recipient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Người nhận vật tư (Tùy chọn)
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-emerald-200">
                        {selectedRecipient ? (
                          <div className="flex items-center gap-2">
                            <span>👤</span>
                            <span className="font-medium">{selectedRecipient.full_name}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 ml-1 bg-slate-50">
                              {selectedRecipient.role === "OWNER" ? "Chủ vườn" : "Nhân viên"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">— Không chọn —</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">— Không chọn —</SelectItem>
                      {staffList.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>👤</span>
                            <span>{user.full_name}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({user.role === "OWNER" ? "Chủ vườn" : "Nhân viên"})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ghi chú */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập ghi chú chi tiết về đợt xuất/nhập vật tư này..."
                      className="resize-none border-emerald-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-700 hover:bg-emerald-800">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ghi nhận giao dịch
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
