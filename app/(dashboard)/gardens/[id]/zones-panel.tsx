"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Zone, ZoneAssignment, User, PaginatedResponse } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Trash2, UserPlus, X } from "lucide-react";

const createZoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  grid_position: z.string().optional(),
});

type CreateZoneFormValues = z.infer<typeof createZoneSchema>;

interface ZonesPanelProps {
  gardenId: string;
}

export function ZonesPanel({ gardenId }: ZonesPanelProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: zones, isLoading } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateZoneFormValues>({
    resolver: zodResolver(createZoneSchema),
  });

  const createMutation = useMutation({
    mutationFn: (newZone: CreateZoneFormValues) =>
      api.post(`api/gardens/${gardenId}/zones`, { json: newZone }).json<Zone>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(gardenId) });
      setOpen(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (zoneId: string) => api.delete(`api/zones/${zoneId}`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(gardenId) });
    },
  });

  const onSubmit = (values: CreateZoneFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Zones</CardTitle>
          <CardDescription>Manage planting zones and staff assignments</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="E.g., Zone A1"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="grid_position">Grid Position (Optional)</Label>
                <Input
                  id="grid_position"
                  {...register("grid_position")}
                  placeholder="E.g., 0,0"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Zone"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading zones...</p>
        ) : !zones || zones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No zones created yet. Add your first zone.
          </p>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} onDelete={() => deleteMutation.mutate(zone.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ZoneCard({ zone, onDelete }: { zone: Zone; onDelete: () => void }) {
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const queryClient = useQueryClient();

  const { data: assignments, isLoading: loadingAssignments } = useQuery<ZoneAssignment[]>({
    queryKey: queryKeys.zoneAssignments(zone.id),
    queryFn: () => api.get(`api/zones/${zone.id}/assignments`).json(),
  });

  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`api/zones/${zone.id}/assignments`, { json: { user_id: userId } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zoneAssignments(zone.id) });
      setOpenAssign(false);
      setSelectedStaff("");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`api/zones/${zone.id}/assignments/${userId}`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zoneAssignments(zone.id) });
    },
  });

  const availableStaff = staffList?.filter(
    (s) => !assignments?.some((a) => a.user_id === s.id)
  ) || [];

  return (
    <div className="border rounded-lg p-4 space-y-3 relative group">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{zone.name}</h4>
          {zone.grid_position && (
            <p className="text-xs text-muted-foreground">Grid: {zone.grid_position}</p>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-secondary/30 rounded p-2 text-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Assigned Staff</span>
          <Dialog open={openAssign} onOpenChange={setOpenAssign}>
            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-6 text-xs px-2" />}>
              <UserPlus className="h-3 w-3 mr-1" /> Assign
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Staff to {zone.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Select Staff</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    <option value="" disabled>Select a staff member...</option>
                    {availableStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.identifier}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" onClick={() => setOpenAssign(false)}>Cancel</Button>
                  <Button 
                    disabled={!selectedStaff || assignMutation.isPending}
                    onClick={() => assignMutation.mutate(selectedStaff)}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {loadingAssignments ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : !assignments || assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No staff assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((assignment) => (
              <div 
                key={assignment.user_id} 
                className="inline-flex items-center gap-1 bg-background border px-2 py-1 rounded-md text-xs"
              >
                <span>{assignment.user_identifier}</span>
                <button 
                  onClick={() => unassignMutation.mutate(assignment.user_id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
