"use client";

import { TaskOut, User, TaskStatus } from "@/types";
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
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

interface TaskDetailsDialogProps {
  task: TaskOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({ task, open, onOpenChange }: TaskDetailsDialogProps) {
  const { t } = useTranslation();
  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
    enabled: !!task,
  });

  if (!task) return null;

  const assigneeName = task.assignee_id 
    ? staffList?.find((s) => s.id === task.assignee_id)?.full_name || `${task.assignee_id.substring(0, 8)}...`
    : t("tasks.unassigned");

  const typeKeyMap: Record<string, TranslationKey> = {
    WATER: "taskType.WATER",
    FERTILIZE: "taskType.FERTILIZE",
    SPRAY: "taskType.SPRAY",
    INSPECT: "taskType.INSPECT",
    HARVEST: "taskType.HARVEST",
    OTHER: "taskType.OTHER",
  };

  const statusKeyMap: Record<TaskStatus, TranslationKey> = {
    PENDING: "taskStatus.PENDING",
    IN_PROGRESS: "taskStatus.IN_PROGRESS",
    DONE: "taskStatus.DONE",
    CANCELLED: "taskStatus.CANCELLED",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("taskDetails.title")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">{t("tasks.colType")}</h4>
                <p className="mt-1 font-medium">{t(typeKeyMap[task.type] || "taskType.OTHER")}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">{t("tasks.colStatus")}</h4>
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
                    {t(statusKeyMap[task.status])}
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">{t("tasks.colAssignee")}</h4>
                <p className="mt-1 text-sm font-medium text-primary">
                  {assigneeName}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">{t("tasks.colDueDate")}</h4>
                <p className="mt-1 text-sm">
                  {task.due_date ? format(new Date(task.due_date), "PPp") : "-"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">{t("taskDetails.completedAt")}</h4>
                <p className="mt-1 text-sm">
                  {task.completed_at ? format(new Date(task.completed_at), "PPp") : "-"}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("tasks.colDescription")}</h4>
              <p className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3">
                {task.description || t("taskDetails.noDesc")}
              </p>
            </div>

            {task.proof_images && task.proof_images.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("taskDetails.proofImages")}</h4>
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
