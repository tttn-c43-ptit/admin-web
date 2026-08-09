"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Zone, ZoneAssignment, User } from "@/types";

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
import { Plus, Trash2, UserPlus, X, Edit2, MapPin, Layers } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

const createZoneSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên phân khu"),
  grid_position: z.string().optional(),
});

type CreateZoneFormValues = z.infer<typeof createZoneSchema>;

interface ZonesPanelProps {
  gardenId: string;
  activeZoneId?: string | null;
  onSelectZone?: (zoneId: string | null) => void;
}

export function ZonesPanel({ gardenId, activeZoneId, onSelectZone }: ZonesPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: zones, isLoading } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
  });

  const nextDefaultPosition = (zones?.length || 0) + 1;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateZoneFormValues>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      name: "",
      grid_position: nextDefaultPosition.toString(),
    },
  });

  const createMutation = useMutation({
    mutationFn: (newZone: { name: string; grid_position?: number }) =>
      api.post(`api/gardens/${gardenId}/zones`, { json: newZone }).json<Zone>(),
    onSuccess: (createdZone) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(gardenId) });
      onSelectZone?.(createdZone.id);
      setOpen(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      await api.delete(`api/zones/${zoneId}`);
      return zoneId;
    },
    onSuccess: (deletedZoneId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(gardenId) });
      onSelectZone?.(null);

      // Clean up localStorage boundary data for deleted zone
      const storageKey = `zone_boundaries_${gardenId}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          delete data[deletedZoneId];
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (e) {
        console.error("Storage error:", e);
      }
    },
  });

  const onSubmit = (values: CreateZoneFormValues) => {
    createMutation.mutate({
      name: values.name,
      grid_position: values.grid_position ? parseInt(values.grid_position, 10) : undefined,
    });
  };

  return (
    <Card className="border shadow-xs">
      <CardHeader className="pb-3 border-b space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2 whitespace-nowrap">
            <Layers className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{t("zones.panelTitle")}</span>
            <span className="text-xs text-slate-500 font-normal">({zones?.length || 0})</span>
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button size="sm" onClick={() => setValue("grid_position", ((zones?.length || 0) + 1).toString())} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                {t("zones.addZone")}
              </Button>
            } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("zones.createNew")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("zones.zoneName")}</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Ví dụ: Phân khu A1, Phân khu B2..."
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grid_position">Vị trí tương đối trong vườn (Thứ tự ô)</Label>
                <Input
                  id="grid_position"
                  type="number"
                  min={1}
                  {...register("grid_position")}
                  placeholder="Ví dụ: 1, 2, 3, 4..."
                />
                <p className="text-xs text-muted-foreground">
                  Thứ tự ô sẽ xác định vị trí tương ứng của phân khu này trên bản đồ ranh giới vườn.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("action.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("action.creating") : t("zones.addZone")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        <CardDescription className="text-xs text-slate-500 leading-normal mt-1">
          {t("zones.panelDesc")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("zones.loading")}</p>
        ) : !zones || zones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("zones.noZones")}
          </p>
        ) : (
          <div className="space-y-3">
            {zones.map((zone) => {
              const isSelected = activeZoneId === zone.id;
              return (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  isSelected={isSelected}
                  onSelect={() => onSelectZone?.(isSelected ? null : zone.id)}
                  onDelete={() => deleteMutation.mutate(zone.id)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ZoneCard({
  zone,
  isSelected,
  onSelect,
  onDelete,
}: {
  zone: Zone;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [openAssign, setOpenAssign] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const queryClient = useQueryClient();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<CreateZoneFormValues>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      name: zone.name,
      grid_position: zone.grid_position ? zone.grid_position.toString() : "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedZone: { name: string; grid_position?: number }) =>
      api.put(`api/zones/${zone.id}`, { json: updatedZone }).json<Zone>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(zone.garden_id) });
      setOpenEdit(false);
    },
  });

  const onSubmitEdit = (values: CreateZoneFormValues) => {
    updateMutation.mutate({
      name: values.name,
      grid_position: values.grid_position ? parseInt(values.grid_position, 10) : undefined,
    });
  };

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
    mutationFn: async (userId: string) => {
      await api.delete(`api/zones/${zone.id}/assignments/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zoneAssignments(zone.id) });
    },
  });

  const availableStaff = staffList?.filter((s) => !assignments?.some((a) => a.user_id === s.id)) || [];

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-3 space-y-3 relative transition-all cursor-pointer ${
        isSelected ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm" : "hover:border-slate-300"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
          <div>
            <h4 className="font-semibold text-sm">{zone.name}</h4>
            {zone.grid_position && (
              <p className="text-xs text-muted-foreground">
                {t("zones.gridPosLabel", { pos: zone.grid_position.toString() })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
              <Edit2 className="h-3.5 w-3.5" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("zones.editTitle")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`edit-name-${zone.id}`}>{t("zones.zoneName")}</Label>
                  <Input id={`edit-name-${zone.id}`} {...registerEdit("name")} />
                  {editErrors.name && <p className="text-sm text-destructive">{editErrors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`edit-grid-${zone.id}`}>Vị trí ô tương đối trong vườn</Label>
                  <Input id={`edit-grid-${zone.id}`} type="number" min={1} {...registerEdit("grid_position")} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenEdit(false);
                      resetEdit({
                        name: zone.name,
                        grid_position: zone.grid_position ? zone.grid_position.toString() : "",
                      });
                    }}
                  >
                    {t("action.cancel")}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t("action.saving") : t("action.save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive h-7 w-7 p-0 hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="bg-secondary/40 rounded p-2 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">
            {t("zones.assignedStaff")}
          </span>
          <Dialog open={openAssign} onOpenChange={setOpenAssign}>
            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-5 text-[11px] px-1.5" />}>
              <UserPlus className="h-3 w-3 mr-1" /> {t("zones.assignButton")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("zones.assignStaffTo").replace("{name}", zone.name)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{t("zones.selectStaff")}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    <option value="" disabled>
                      {t("zones.selectStaffPlaceholder")}
                    </option>
                    {availableStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} {s.email ? `(${s.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" onClick={() => setOpenAssign(false)}>
                    {t("action.cancel")}
                  </Button>
                  <Button
                    disabled={!selectedStaff || assignMutation.isPending}
                    onClick={() => assignMutation.mutate(selectedStaff)}
                  >
                    {t("zones.assignButton")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingAssignments ? (
          <p className="text-xs text-muted-foreground">{t("zones.loading")}</p>
        ) : !assignments || assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("zones.noStaffAssigned")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((assignment) => (
              <div
                key={assignment.user_id}
                className="inline-flex items-center gap-1 bg-background border px-2 py-0.5 rounded text-xs"
              >
                <span>{assignment.full_name}</span>
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
