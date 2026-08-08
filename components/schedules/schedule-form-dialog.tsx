"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { localToUtcCron, parseUtcCronToLocalForm } from "@/lib/cron-utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Zone, ScheduleOut } from "@/types";

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
import { CalendarClock, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

const scheduleSchema = z.object({
  type: z.enum(["WATER", "FERTILIZE", "SPRAY", "INSPECT", "HARVEST", "OTHER"]),
  description: z.string().max(5000).optional(),
  zone_id: z.string().uuid("Invalid Zone ID").optional().or(z.literal("")),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  dayOfWeek: z.string().optional(),
  dayOfMonth: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleFormDialogProps {
  gardenId: string;
  initialData?: ScheduleOut;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  onSuccess?: () => void;
}

export function ScheduleFormDialog({ gardenId, initialData, open: controlledOpen, onOpenChange: setControlledOpen, trigger, onSuccess }: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setUncontrolledOpen;

  const isEditing = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: user } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.get("api/auth/me").json<{ role: string }>(),
  });
  const role = user?.role;

  const { data: zones } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
  });

  const defaultValues = (() => {
    if (initialData) {
      const parsedCron = parseUtcCronToLocalForm(initialData.cron_expr);
      return {
        type: initialData.type as any,
        description: initialData.description || "",
        zone_id: initialData.zone_id || "",
        frequency: parsedCron.frequency,
        time: parsedCron.time,
        dayOfWeek: parsedCron.dayOfWeek,
        dayOfMonth: parsedCron.dayOfMonth,
      };
    }
    return {
      type: "WATER",
      description: "",
      zone_id: "",
      frequency: "DAILY",
      time: "08:00",
      dayOfWeek: "1",
      dayOfMonth: "1",
    };
  })();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaultValues as any,
  });

  // Reset form when dialog opens if editing
  useEffect(() => {
    if (open) {
      form.reset(defaultValues as any);
    }
  }, [open, initialData]);

  const frequency = form.watch("frequency");

  const onSubmit = async (data: ScheduleFormValues) => {
    setIsSubmitting(true);
    try {
      let cron_expr = localToUtcCron(data.frequency, data.time, data.dayOfWeek || "1", data.dayOfMonth || "1");

      const payload = {
        type: data.type,
        cron_expr,
        description: data.description,
        zone_id: data.zone_id || undefined,
        is_active: true,
      };

      if (isEditing) {
        await api.put(`api/schedules/${initialData.id}`, { json: payload });
      } else {
        await api.post(`api/gardens/${gardenId}/schedules`, { json: payload });
      }
      
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save schedule", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (role !== "OWNER") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={
          <Button variant="outline">
            <CalendarClock className="mr-2 h-4 w-4" />
            {t("schedules.createTitle")}
          </Button>
        } />
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("schedules.editTitle") : t("schedules.createTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.colType")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("taskForm.selectType")} />
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

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("schedules.frequency")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("schedules.frequency")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAILY">{t("schedules.daily")}</SelectItem>
                      <SelectItem value="WEEKLY">{t("schedules.weekly")}</SelectItem>
                      <SelectItem value="MONTHLY">{t("schedules.monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("schedules.time")}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {frequency === "WEEKLY" && (
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("schedules.dayOfWeek")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("schedules.dayOfWeek")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Thứ Hai (Monday)</SelectItem>
                          <SelectItem value="2">Thứ Ba (Tuesday)</SelectItem>
                          <SelectItem value="3">Thứ Tư (Wednesday)</SelectItem>
                          <SelectItem value="4">Thứ Năm (Thursday)</SelectItem>
                          <SelectItem value="5">Thứ Sáu (Friday)</SelectItem>
                          <SelectItem value="6">Thứ Bảy (Saturday)</SelectItem>
                          <SelectItem value="0">Chủ Nhật (Sunday)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {frequency === "MONTHLY" && (
                <FormField
                  control={form.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("schedules.dayOfMonth")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("schedules.applyZone")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("schedules.allZones")}>
                          {field.value ? zones?.find(z => z.id === field.value)?.name || t("schedules.allZones") : t("schedules.allZones")}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">{t("schedules.allZones")}</SelectItem>
                      {zones?.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("action.saving")}
                </>
              ) : (
                isEditing ? t("action.save") : t("action.create")
              )}
            </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
