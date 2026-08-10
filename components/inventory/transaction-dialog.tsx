"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem, PaginatedResponse, TaskOut, User } from "@/types";

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
import { toast } from "sonner";
import { Loader2, ClipboardList, UserCheck, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

const formSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().gt(0, "Quantity must be greater than 0"),
  task_id: z.string().optional(),
  recipient_id: z.string().optional(),
  approved_by_id: z.string().optional(),
  note: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

  // Fetch garden tasks
  const { data: tasksData } = useQuery({
    queryKey: ["gardens", item?.garden_id, "tasks"],
    queryFn: () =>
      api
        .get(`api/gardens/${item?.garden_id}/tasks?limit=100`)
        .json<PaginatedResponse<TaskOut>>(),
    enabled: !!item?.garden_id,
  });

  // Fetch staff & users list
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      api.get("api/staff?limit=100").json<PaginatedResponse<User>>(),
    enabled: !!item,
  });

  const tasks = tasksData?.items || [];
  const staffList = staffData?.items || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      direction: "OUT",
      quantity: 1,
      task_id: "none",
      recipient_id: "none",
      approved_by_id: "none",
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
        approved_by_id: "none",
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
      await api.post(`api/inventory/${item.id}/transactions`, {
        json: {
          direction: values.direction,
          quantity: values.quantity,
          task_id: values.task_id && values.task_id !== "none" ? values.task_id : null,
          recipient_id: values.recipient_id && values.recipient_id !== "none" ? values.recipient_id : null,
          approved_by_id: values.approved_by_id && values.approved_by_id !== "none" ? values.approved_by_id : null,
          note: values.note || null,
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

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            {currentDirection === "OUT" ? "Phiếu Xuất Kho Vật Tư:" : "Phiếu Nhập Kho Vật Tư:"} {item?.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center text-sm">
              <span className="text-emerald-900 font-medium">{t("txDialog.currentStock")}</span>
              <span className="font-mono font-bold text-emerald-800 text-base">
                {item?.quantity} {item?.unit || ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("txDialog.directionLabel")}</FormLabel>
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
                        <SelectItem value="OUT">🔴 Xuất kho (OUT)</SelectItem>
                        <SelectItem value="IN">🟢 Nhập kho (IN)</SelectItem>
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
                    <FormLabel>{t("txDialog.quantityLabel")}</FormLabel>
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

            {/* Công việc liên quan (Task) */}
            <FormField
              control={form.control}
              name="task_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                    Công việc sử dụng vật tư (Task liên quan)
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-emerald-200">
                        <SelectValue placeholder="-- Không chọn công việc (Xuất lẻ) --" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- Không chọn công việc (Xuất lẻ) --</SelectItem>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          📋 {task.title || `Công việc ${task.type}`} ({task.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Người nhận vật tư */}
              <FormField
                control={form.control}
                name="recipient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      Người nhận vật tư
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue placeholder="-- Chọn người nhận --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- Chọn người nhận --</SelectItem>
                        {staffList.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            👤 {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Người duyệt xuất kho (Optional) */}
              <FormField
                control={form.control}
                name="approved_by_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-emerald-900">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Người duyệt (Tùy chọn)
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue placeholder="-- Không chọn người duyệt --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- Không chọn --</SelectItem>
                        {staffList.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            🛡️ {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("txDialog.noteLabel")}</FormLabel>
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
                {t("action.cancel")}
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
