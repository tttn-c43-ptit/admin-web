"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Plant, Zone } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(16, "Max 16 chars"),
  zone_id: z.string().optional(),
  status: z.enum(["HEALTHY", "SICK", "DEAD", "UNKNOWN", "WATCHING"]),
  planted_at: z.string().optional(),
  grid_x: z.any().transform((val) => val !== "" ? Number(val) : undefined).optional(),
  grid_y: z.any().transform((val) => val !== "" ? Number(val) : undefined).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdatePlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  onSuccess: () => void;
  zonesData?: Zone[];
}

export function UpdatePlantDialog({
  open,
  onOpenChange,
  plant,
  onSuccess,
  zonesData,
}: UpdatePlantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: plant.code,
      status: plant.status,
      zone_id: plant.zone_id || "",
      grid_x: plant.grid_x ?? "",
      grid_y: plant.grid_y ?? "",
      planted_at: plant.planted_at ? new Date(plant.planted_at).toISOString().split('T')[0] : "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: plant.code,
        status: plant.status,
        zone_id: plant.zone_id || "",
        grid_x: plant.grid_x ?? "",
        grid_y: plant.grid_y ?? "",
        planted_at: plant.planted_at ? new Date(plant.planted_at).toISOString().split('T')[0] : "",
      });
    }
  }, [open, plant, reset]);

  async function onSubmit(values: any) {
    setIsSubmitting(true);
    try {
      await api.put(`api/plants/${plant.id}`, {
        json: {
          code: values.code,
          zone_id: values.zone_id || null,
          status: values.status,
          planted_at: values.planted_at || null,
          grid_x: values.grid_x,
          grid_y: values.grid_y,
        },
      }).json();
      
      toast.success(`Successfully updated plant ${values.code}`);
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update plant");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Plant</DialogTitle>
          <DialogDescription>
            Update details for plant {plant.code}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Plant Code</Label>
            <Input id="code" placeholder="e.g. SR-001" {...register("code")} />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    <SelectItem value="HEALTHY">Healthy</SelectItem>
                    <SelectItem value="WATCHING">Watching</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="DEAD">Dead</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_id">Zone (Optional)</Label>
            <Controller
              control={control}
              name="zone_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a zone">
                      {field.value ? zonesData?.find((z) => z.id === field.value)?.name : "Select a zone"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {zonesData?.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grid_x">Grid X (Optional)</Label>
              <Input id="grid_x" type="number" step="any" placeholder="X coordinate" {...register("grid_x")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_y">Grid Y (Optional)</Label>
              <Input id="grid_y" type="number" step="any" placeholder="Y coordinate" {...register("grid_y")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planted_at">Planted At (Optional)</Label>
            <Input id="planted_at" type="date" {...register("planted_at")} />
            {errors.planted_at && (
              <p className="text-sm text-destructive">{errors.planted_at.message as string}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
