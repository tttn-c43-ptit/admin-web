"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { TaskOut } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Loader2 } from "lucide-react";
import { getUserRole } from "@/lib/jwt";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { GardenDetail, PaginatedResponse, User } from "@/types";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";
import { saveTaskRecurrence } from "@/lib/task-recurrence-store";

const typeKeyMap: Record<string, TranslationKey> = {
  WATER: "taskType.WATER",
  FERTILIZE: "taskType.FERTILIZE",
  SPRAY: "taskType.SPRAY",
  INSPECT: "taskType.INSPECT",
  HARVEST: "taskType.HARVEST",
  OTHER: "taskType.OTHER",
};

const repeatKeyMap: Record<string, TranslationKey> = {
  NONE: "taskForm.repeatNone",
  DAILY: "taskForm.repeatDaily",
  WEEKLY: "taskForm.repeatWeekly",
  MONTHLY: "taskForm.repeatMonthly",
};

const taskSchema = z.object({
  title: z.string().max(150).optional(),
  garden_id: z.string().min(1, "Vui lòng chọn khu vườn"),
  type: z.enum(["WATER", "FERTILIZE", "SPRAY", "INSPECT", "HARVEST", "OTHER"]),
  description: z.string().max(5000).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
  repeat_pattern: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]),
  repeat_until: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  taskToEdit?: TaskOut;
  gardenId?: string;
  trigger?: React.ReactElement;
}

export function TaskFormDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
  taskToEdit,
  gardenId,
  trigger,
}: TaskFormDialogProps) {
  const { t } = useTranslation();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setUncontrolledOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(getUserRole());
  }, []);

  const { data: gardensResponse } = useQuery<PaginatedResponse<GardenDetail>>({
    queryKey: ["gardens", "dropdown"],
    queryFn: () => api.get("api/gardens").json(),
    enabled: !gardenId,
  });

  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
  });
  
  const gardens = gardensResponse?.items || [];

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: taskToEdit?.title || "",
      garden_id: taskToEdit?.garden_id || gardenId || "",
      type: taskToEdit?.type || "WATER",
      description: taskToEdit?.description || "",
      start_date: taskToEdit?.start_date
        ? new Date(taskToEdit.start_date).toISOString().slice(0, 16)
        : "",
      due_date: taskToEdit?.due_date
        ? new Date(taskToEdit.due_date).toISOString().slice(0, 16)
        : "",
      assignee_id: taskToEdit?.assignee_id || "",
      repeat_pattern: taskToEdit?.repeat_pattern || "NONE",
      repeat_until: taskToEdit?.repeat_until
        ? new Date(taskToEdit.repeat_until).toISOString().slice(0, 10)
        : "",
    },
  });

  const watchRepeatPattern = form.watch("repeat_pattern");

  useEffect(() => {
    if (open) {
      form.reset({
        title: taskToEdit?.title || "",
        garden_id: taskToEdit?.garden_id || gardenId || "",
        type: taskToEdit?.type || "WATER",
        description: taskToEdit?.description || "",
        start_date: taskToEdit?.start_date
          ? new Date(taskToEdit.start_date).toISOString().slice(0, 16)
          : "",
        due_date: taskToEdit?.due_date
          ? new Date(taskToEdit.due_date).toISOString().slice(0, 16)
          : "",
        assignee_id: taskToEdit?.assignee_id || "",
        repeat_pattern: taskToEdit?.repeat_pattern || "NONE",
        repeat_until: taskToEdit?.repeat_until
          ? new Date(taskToEdit.repeat_until).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [open, taskToEdit, gardenId, form]);

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        title: data.title || undefined,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        assignee_id: data.assignee_id || undefined,
        repeat_pattern: data.repeat_pattern,
        repeat_until: data.repeat_pattern !== "NONE" && data.repeat_until ? new Date(data.repeat_until).toISOString() : undefined,
      };

      let resTask: TaskOut | null = null;
      if (taskToEdit) {
        resTask = await api.put(`api/tasks/${taskToEdit.id}`, { json: payload }).json();
        const tId = resTask?.id || taskToEdit.id;
        if (tId) {
          saveTaskRecurrence(tId, {
            repeat_pattern: data.repeat_pattern,
            repeat_until: payload.repeat_until,
          });
        }
      } else {
        resTask = await api.post("api/tasks", { json: payload }).json();
        if (resTask?.id) {
          saveTaskRecurrence(resTask.id, {
            repeat_pattern: data.repeat_pattern,
            repeat_until: payload.repeat_until,
          });
        }
      }
      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to save task", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!taskToEdit && (
        trigger ? (
          <DialogTrigger render={trigger} />
        ) : (
          <DialogTrigger render={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("tasks.createTask")}
            </Button>
          } />
        )
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {taskToEdit ? t("taskForm.editTitle") : t("taskForm.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!gardenId && (
              <FormField
                control={form.control}
                name="garden_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.gardenLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("taskForm.selectGarden")}>
                            {field.value ? gardens.find(g => g.id === field.value)?.name : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gardens.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            {t("dashboard.noGardensPrompt")}
                          </SelectItem>
                        ) : (
                          gardens.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.typeLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("taskForm.selectType")}>
                          {field.value ? t(typeKeyMap[field.value] || "taskType.OTHER") : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WATER">{t("taskType.WATER")}</SelectItem>
                      <SelectItem value="FERTILIZE">{t("taskType.FERTILIZE")}</SelectItem>
                      <SelectItem value="SPRAY">{t("taskType.SPRAY")}</SelectItem>
                      <SelectItem value="INSPECT">{t("taskType.INSPECT")}</SelectItem>
                      <SelectItem value="HARVEST">{t("taskType.HARVEST")}</SelectItem>
                      <SelectItem value="OTHER">{t("taskType.OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.startDateLabel")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.dueDateLabel")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="repeat_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.repeatPatternLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("taskForm.selectRepeatPattern")}>
                            {field.value ? t(repeatKeyMap[field.value] || "taskForm.repeatNone") : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">{t("taskForm.repeatNone")}</SelectItem>
                        <SelectItem value="DAILY">{t("taskForm.repeatDaily")}</SelectItem>
                        <SelectItem value="WEEKLY">{t("taskForm.repeatWeekly")}</SelectItem>
                        <SelectItem value="MONTHLY">{t("taskForm.repeatMonthly")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRepeatPattern !== "NONE" && (
                <FormField
                  control={form.control}
                  name="repeat_until"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in-0">
                      <FormLabel className="text-amber-700 font-medium">{t("taskForm.repeatUntilLabel")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.assigneeLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("taskForm.selectAssignee")}>
                          {field.value ? staffList?.find((s) => s.id === field.value)?.full_name : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">{t("tasks.unassigned")}</SelectItem>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name} {staff.email ? `(${staff.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("taskForm.descPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("taskForm.submitSaving")}
                  </>
                ) : (
                  t("taskForm.submitSave")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
