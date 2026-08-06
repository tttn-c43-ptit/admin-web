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

const taskSchema = z.object({
  garden_id: z.string().uuid("Please select a garden"),
  type: z.enum(["WATER", "FERTILIZE", "SPRAY", "INSPECT", "HARVEST", "OTHER"]),
  description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
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
      garden_id: taskToEdit?.garden_id || gardenId || "",
      type: taskToEdit?.type || "WATER",
      description: taskToEdit?.description || "",
      due_date: taskToEdit?.due_date
        ? new Date(taskToEdit.due_date).toISOString().slice(0, 16)
        : "",
      assignee_id: taskToEdit?.assignee_id || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        garden_id: taskToEdit?.garden_id || gardenId || "",
        type: taskToEdit?.type || "WATER",
        description: taskToEdit?.description || "",
        due_date: taskToEdit?.due_date
          ? new Date(taskToEdit.due_date).toISOString().slice(0, 16)
          : "",
        assignee_id: taskToEdit?.assignee_id || "",
      });
    }
  }, [open, taskToEdit, gardenId, form]);

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        assignee_id: data.assignee_id || undefined,
      };

      if (taskToEdit) {
        await api.put(`api/tasks/${taskToEdit.id}`, { json: payload });
      } else {
        await api.post("api/tasks", { json: payload });
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

  // Only OWNER can create tasks
  // if (role === null) return null; // Avoid hydration mismatch or rendering before role is loaded
  // if (role !== "OWNER" && !taskToEdit) {
  //   return null;
  // }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!taskToEdit && (
        trigger ? (
          <DialogTrigger render={trigger} />
        ) : (
          <DialogTrigger render={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          } />
        )
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {taskToEdit ? "Edit Task" : "Create New Task"}
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
                    <FormLabel>Garden</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a garden">
                            {field.value ? gardens.find(g => g.id === field.value)?.name : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gardens.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No gardens found or loading...
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
                  <FormLabel>Task Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member">
                          {field.value ? staffList?.find((s) => s.id === field.value)?.full_name : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
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
                    Saving...
                  </>
                ) : (
                  "Save Task"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
