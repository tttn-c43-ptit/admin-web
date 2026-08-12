"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Loader2,
  ClipboardList,
  UserCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
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

// ── Searchable Combobox ───────────────────────────────────────────────────────

interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: { text: string; className: string };
  icon?: string;
  dimmed?: boolean;
  groupHeader?: string;
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  renderTrigger?: (selected: ComboboxOption | undefined) => React.ReactNode;
}

function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder = "— Không chọn —",
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không tìm thấy kết quả",
  disabled,
  renderTrigger,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const normalizeStr = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          normalizeStr(o.label).includes(normalizeStr(search)) ||
          (o.sublabel && normalizeStr(o.sublabel).includes(normalizeStr(search))) ||
          (o.badge && normalizeStr(o.badge.text).includes(normalizeStr(search)))
      )
    : options;

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-md border border-emerald-200 bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-10 ${
          open ? "ring-2 ring-emerald-400 ring-offset-1" : "hover:border-emerald-400"
        }`}
      >
        <span className="flex-1 text-left truncate">
          {renderTrigger ? (
            renderTrigger(selected)
          ) : selected && selected.value !== "none" ? (
            <span className="flex items-center gap-2">
              {selected.icon && <span>{selected.icon}</span>}
              <span className="font-medium">{selected.label}</span>
              {selected.badge && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${selected.badge.className}`}>
                  {selected.badge.text}
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-700"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                const prevOpt = filtered[idx - 1];
                const showGroup =
                  opt.groupHeader && opt.groupHeader !== prevOpt?.groupHeader;

                return (
                  <div key={opt.value}>
                    {showGroup && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {opt.groupHeader}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-900"
                          : opt.dimmed
                          ? "opacity-60 hover:bg-slate-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </span>
                      {opt.badge && (
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 shrink-0 ${opt.badge.className}`}
                        >
                          {opt.badge.text}
                        </Badge>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const activeTasks = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS"
  );
  const doneTasks = tasks.filter(
    (t) => t.status === "DONE" || t.status === "CANCELLED"
  );

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
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedRecipientId = form.watch("recipient_id");
  const selectedRecipient = staffList.find((s) => s.id === selectedRecipientId);

  // Build task combobox options
  const taskOptions: ComboboxOption[] = [
    {
      value: "none",
      label: "Không gắn công việc (xuất lẻ)",
      groupHeader: "",
    },
    ...activeTasks.map((task) => ({
      value: task.id,
      label: `${TASK_TYPE_VI[task.type]}${task.title ? `: ${task.title}` : ""}`,
      sublabel: task.due_date
        ? `Hạn: ${new Date(task.due_date).toLocaleDateString("vi-VN")}`
        : undefined,
      icon: TASK_TYPE_ICON[task.type],
      badge: {
        text: TASK_STATUS_VI[task.status],
        className: TASK_STATUS_COLOR[task.status],
      },
      groupHeader: "Đang hoạt động",
    })),
    ...doneTasks.map((task) => ({
      value: task.id,
      label: `${TASK_TYPE_VI[task.type]}${task.title ? `: ${task.title}` : ""}`,
      sublabel: task.due_date
        ? `Hạn: ${new Date(task.due_date).toLocaleDateString("vi-VN")}`
        : undefined,
      icon: TASK_TYPE_ICON[task.type],
      badge: {
        text: TASK_STATUS_VI[task.status],
        className: TASK_STATUS_COLOR[task.status],
      },
      groupHeader: "Đã kết thúc",
      dimmed: true,
    })),
  ];

  // Build staff combobox options
  const staffOptions: ComboboxOption[] = [
    { value: "none", label: "Không chọn" },
    ...staffList.map((user) => ({
      value: user.id,
      label: user.full_name,
      sublabel: user.email || undefined,
      icon: "👤",
      badge: {
        text: user.role === "OWNER" ? "Chủ vườn" : "Nhân viên",
        className: user.role === "OWNER"
          ? "bg-purple-100 text-purple-800 border-purple-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
      },
    })),
  ];

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

            {/* Công việc liên quan — Searchable */}
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                Gắn vào công việc (Tùy chọn)
              </FormLabel>
              <Controller
                control={form.control}
                name="task_id"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || "none"}
                    onChange={field.onChange}
                    options={taskOptions}
                    placeholder="— Không gắn công việc (xuất lẻ) —"
                    searchPlaceholder="Tìm theo tên công việc, loại, hạn..."
                    emptyText="Không tìm thấy công việc phù hợp"
                    renderTrigger={(selected) =>
                      selected && selected.value !== "none" ? (
                        <span className="flex items-center gap-2 py-0.5">
                          <span>{selected.icon}</span>
                          <span className="font-medium text-sm">{selected.label}</span>
                          {selected.badge && (
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ml-1 ${selected.badge.className}`}
                            >
                              {selected.badge.text}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          — Không gắn công việc (xuất lẻ) —
                        </span>
                      )
                    }
                  />
                )}
              />
            </FormItem>

            {/* Người nhận vật tư — Searchable */}
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                Người nhận vật tư (Tùy chọn)
              </FormLabel>
              <Controller
                control={form.control}
                name="recipient_id"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || "none"}
                    onChange={field.onChange}
                    options={staffOptions}
                    placeholder="— Không chọn —"
                    searchPlaceholder="Tìm theo tên, email, chức vụ..."
                    emptyText="Không tìm thấy nhân viên phù hợp"
                    renderTrigger={(selected) =>
                      selected && selected.value !== "none" ? (
                        <span className="flex items-center gap-2">
                          <span>👤</span>
                          <span className="font-medium">{selected.label}</span>
                          {selected.badge && (
                            <Badge
                              variant="outline"
                              className={`text-xs px-1.5 py-0 ml-1 ${selected.badge.className}`}
                            >
                              {selected.badge.text}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">— Không chọn —</span>
                      )
                    }
                  />
                )}
              />
            </FormItem>

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
