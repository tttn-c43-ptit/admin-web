"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ScheduleOut, Zone } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, CalendarClock, Leaf, Droplet, Bug, Search, FileText, Pencil } from "lucide-react";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import { getUserRole } from "@/lib/jwt";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SchedulesPanelProps {
  gardenId: string;
}

import { utcToLocalCronString as formatCron } from "@/lib/cron-utils";

const TaskTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "WATER": return <Droplet className="h-4 w-4 text-blue-500" />;
    case "FERTILIZE": return <Leaf className="h-4 w-4 text-green-500" />;
    case "SPRAY": return <Bug className="h-4 w-4 text-red-500" />;
    case "INSPECT": return <Search className="h-4 w-4 text-purple-500" />;
    case "HARVEST": return <FileText className="h-4 w-4 text-orange-500" />;
    default: return <CalendarClock className="h-4 w-4 text-gray-500" />;
  }
};

export function SchedulesPanel({ gardenId }: SchedulesPanelProps) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.get("api/auth/me").json<{ role: string }>(),
  });
  const role = user?.role;

  const { data: schedules, isLoading } = useQuery<ScheduleOut[]>({
    queryKey: queryKeys.schedules(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/schedules`).json(),
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
  });

  const getZoneName = (zoneId: string) => {
    const zone = zones?.find((z) => z.id === zoneId);
    return zone ? zone.name : "Unknown Zone";
  };

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await api.delete(`api/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules(gardenId) });
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Care Schedules</CardTitle>
          <CardDescription>Manage recurring tasks for this garden</CardDescription>
        </div>
        <ScheduleFormDialog 
          gardenId={gardenId} 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.schedules(gardenId) })} 
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading schedules...</p>
        ) : !schedules || schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No care schedules configured yet.
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card/50 shadow-sm gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1 bg-background p-2 rounded-full border">
                    <TaskTypeIcon type={schedule.type} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {schedule.type.charAt(0).toUpperCase() + schedule.type.slice(1).toLowerCase()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatCron(schedule.cron_expr)}
                      </Badge>
                      {schedule.zone_id && (
                        <Badge variant="secondary" className="text-xs max-w-[120px] truncate" title={getZoneName(schedule.zone_id)}>
                          Zone: {getZoneName(schedule.zone_id)}
                        </Badge>
                      )}
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {schedule.description}
                      </p>
                    )}
                    {schedule.next_run_at && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Next run: {format(new Date(schedule.next_run_at), "MMM d, yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
                {role === "OWNER" && (
                  <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                    <ScheduleFormDialog
                      gardenId={gardenId}
                      initialData={schedule}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.schedules(gardenId) })}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(schedule.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
