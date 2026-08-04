"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";

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
import { getUserRole } from "@/lib/jwt";

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
  onSuccess?: () => void;
}

export function ScheduleFormDialog({ gardenId, onSuccess }: ScheduleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = getUserRole();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      type: "WATER",
      description: "",
      zone_id: "",
      frequency: "DAILY",
      time: "08:00",
      dayOfWeek: "1",
      dayOfMonth: "1",
    },
  });

  const frequency = form.watch("frequency");

  const onSubmit = async (data: ScheduleFormValues) => {
    setIsSubmitting(true);
    try {
      const [hour, minute] = data.time.split(":");
      
      let cron_expr = "";
      if (data.frequency === "DAILY") {
        cron_expr = `${parseInt(minute)} ${parseInt(hour)} * * *`;
      } else if (data.frequency === "WEEKLY") {
        cron_expr = `${parseInt(minute)} ${parseInt(hour)} * * ${data.dayOfWeek}`;
      } else if (data.frequency === "MONTHLY") {
        cron_expr = `${parseInt(minute)} ${parseInt(hour)} ${data.dayOfMonth} * *`;
      }

      const payload = {
        type: data.type,
        cron_expr,
        description: data.description,
        zone_id: data.zone_id || undefined,
        is_active: true,
      };

      await api.post(`api/gardens/${gardenId}/schedules`, { json: payload });
      
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
      <DialogTrigger render={
        <Button variant="outline">
          <CalendarClock className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Recurring Schedule</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WATER">Water</SelectItem>
                      <SelectItem value="FERTILIZE">Fertilize</SelectItem>
                      <SelectItem value="SPRAY">Spray</SelectItem>
                      <SelectItem value="INSPECT">Inspect</SelectItem>
                      <SelectItem value="HARVEST">Harvest</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
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
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
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
                    <FormLabel>Time</FormLabel>
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
                      <FormLabel>Day of Week</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                          <SelectItem value="0">Sunday</SelectItem>
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
                      <FormLabel>Day of Month</FormLabel>
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
                  <FormLabel>Zone ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Apply to specific zone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
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
                    Creating...
                  </>
                ) : (
                  "Create Schedule"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
