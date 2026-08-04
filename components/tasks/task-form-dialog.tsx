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

const taskSchema = z.object({
  garden_id: z.string().uuid("Invalid Garden ID"),
  type: z.enum(["WATER", "FERTILIZE", "SPRAY", "INSPECT", "HARVEST", "OTHER"]),
  description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  taskToEdit?: TaskOut;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  onSuccess,
  taskToEdit,
}: TaskFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      garden_id: taskToEdit?.garden_id || "",
      type: taskToEdit?.type || "WATER",
      description: taskToEdit?.description || "",
      due_date: taskToEdit?.due_date
        ? new Date(taskToEdit.due_date).toISOString().slice(0, 16)
        : "",
    },
  });

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
      };

      if (taskToEdit) {
        await api.put(`api/tasks/${taskToEdit.id}`, { json: payload });
      } else {
        await api.post("api/tasks", { json: payload });
      }
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Failed to save task", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only OWNER can create tasks
  if (role === null) return null; // Avoid hydration mismatch or rendering before role is loaded
  if (role !== "OWNER" && !taskToEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!taskToEdit && (
        <DialogTrigger render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        } />
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {taskToEdit ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="garden_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Garden ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Garden UUID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
