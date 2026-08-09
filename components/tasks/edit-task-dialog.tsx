"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { TaskOut, User } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

const typeKeyMap: Record<string, TranslationKey> = {
  WATER: "taskType.WATER",
  FERTILIZE: "taskType.FERTILIZE",
  SPRAY: "taskType.SPRAY",
  INSPECT: "taskType.INSPECT",
  HARVEST: "taskType.HARVEST",
  OTHER: "taskType.OTHER",
};

const statusKeyMap: Record<string, TranslationKey> = {
  PENDING: "taskStatus.PENDING",
  IN_PROGRESS: "taskStatus.IN_PROGRESS",
  DONE: "taskStatus.DONE",
  CANCELLED: "taskStatus.CANCELLED",
};

const taskSchema = z.object({
  type: z.enum(["WATER", "FERTILIZE", "SPRAY", "INSPECT", "HARVEST", "OTHER"]),
  description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskOut;
  onSuccess: () => void;
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: EditTaskDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff for assignment
  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      type: task.type,
      description: task.description || "",
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
      assignee_id: task.assignee_id || "",
      status: task.status,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type: task.type,
        description: task.description || "",
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
        assignee_id: task.assignee_id || "",
        status: task.status,
      });
    }
  }, [open, task, reset]);

  async function onSubmit(values: TaskFormValues) {
    setIsSubmitting(true);
    try {
      const payload: any = {
        type: values.type,
        status: values.status,
        assignee_id: values.assignee_id || null,
      };

      if (values.description) {
        payload.description = values.description;
      }
      
      if (values.due_date) {
        payload.due_date = new Date(values.due_date).toISOString();
      }

      await api.put(`api/tasks/${task.id}`, {
        json: payload,
      }).json();
      
      toast.success("Task updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("taskForm.editTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t("taskForm.typeLabel")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("taskForm.selectType")}>
                      {field.value ? t(typeKeyMap[field.value] || "taskType.OTHER") : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WATER">{t("taskType.WATER")}</SelectItem>
                    <SelectItem value="FERTILIZE">{t("taskType.FERTILIZE")}</SelectItem>
                    <SelectItem value="SPRAY">{t("taskType.SPRAY")}</SelectItem>
                    <SelectItem value="INSPECT">{t("taskType.INSPECT")}</SelectItem>
                    <SelectItem value="HARVEST">{t("taskType.HARVEST")}</SelectItem>
                    <SelectItem value="OTHER">{t("taskType.OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>{t("tasks.colStatus")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("plants.colStatus")}>
                      {field.value ? t(statusKeyMap[field.value] || "taskStatus.PENDING") : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{t("taskStatus.PENDING")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("taskStatus.IN_PROGRESS")}</SelectItem>
                    <SelectItem value="DONE">{t("taskStatus.DONE")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("taskStatus.CANCELLED")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("taskForm.descriptionLabel")}</Label>
            <Textarea
              {...register("description")}
              placeholder={t("taskForm.descPlaceholder")}
              className="resize-none"
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("taskForm.dueDateLabel")}</Label>
            <Input
              type="datetime-local"
              {...register("due_date")}
            />
            {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("taskForm.assigneeLabel")}</Label>
            <Controller
              control={control}
              name="assignee_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("taskForm.selectAssignee")}>
                      {field.value ? staffList?.find((s) => s.id === field.value)?.full_name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("tasks.unassigned")}</SelectItem>
                    {staffList?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name} {staff.email ? `(${staff.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assignee_id && <p className="text-sm text-destructive">{errors.assignee_id.message}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("taskForm.submitSaving")}
                </>
              ) : (
                t("action.save")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
