"use client";

import { TaskOut, User } from "@/types";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient as api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface TaskDetailsDialogProps {
  task: TaskOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({ task, open, onOpenChange }: TaskDetailsDialogProps) {
  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
    enabled: !!task,
  });

  if (!task) return null;

  const assigneeName = task.assignee_id 
    ? staffList?.find((s) => s.id === task.assignee_id)?.full_name || `${task.assignee_id.substring(0, 8)}...`
    : "Unassigned";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                <p className="mt-1 font-medium">{task.type}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <div className="mt-1">
                  <Badge
                    variant={
                      task.status === "DONE"
                        ? "default"
                        : task.status === "CANCELLED"
                        ? "destructive"
                        : task.status === "IN_PROGRESS"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Assignee</h4>
                <p className="mt-1 text-sm font-medium text-primary">
                  {assigneeName}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                <p className="mt-1 text-sm">
                  {task.due_date ? format(new Date(task.due_date), "PPp") : "-"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Completed At</h4>
                <p className="mt-1 text-sm">
                  {task.completed_at ? format(new Date(task.completed_at), "PPp") : "-"}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3">
                {task.description || "No description provided."}
              </p>
            </div>

            {task.proof_images && task.proof_images.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Proof Images</h4>
                <div className="grid grid-cols-2 gap-2">
                  {task.proof_images.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-md overflow-hidden bg-muted">
                      <Image 
                        src={img} 
                        alt={`Proof ${i + 1}`} 
                        fill 
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
