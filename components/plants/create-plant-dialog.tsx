"use client";

import { useState } from "react";
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
import { Zone } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/components/i18n-provider";

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(16, "Max 16 chars"),
  zone_id: z.string().optional(),
  status: z.enum(["HEALTHY", "SICK", "DEAD", "UNKNOWN", "WATCHING"]),
  planted_at: z.string().optional(),
  grid_x: z.any().transform((val) => val ? Number(val) : undefined).optional(),
  grid_y: z.any().transform((val) => val ? Number(val) : undefined).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: () => void;
  zonesData?: Zone[];
}

export function CreatePlantDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
  zonesData,
}: CreatePlantDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "UNKNOWN",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await api.post(`api/gardens/${gardenId}/plants`, {
        json: {
          code: values.code,
          zone_id: values.zone_id || null,
          status: values.status,
          planted_at: values.planted_at || null,
          grid_x: values.grid_x,
          grid_y: values.grid_y,
        },
      }).json();
      
      toast.success(`Successfully created plant ${values.code}`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to create plant");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("createPlant.title")}</DialogTitle>
          <DialogDescription>
            {t("createPlant.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{t("createPlant.codeLabel")}</Label>
            <Input id="code" placeholder={t("createPlant.codePlaceholder")} {...register("code")} />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("createPlant.statusLabel")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("createPlant.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">{t("status.unknown")}</SelectItem>
                    <SelectItem value="HEALTHY">{t("status.healthy")}</SelectItem>
                    <SelectItem value="WATCHING">{t("status.watching")}</SelectItem>
                    <SelectItem value="SICK">{t("status.sick")}</SelectItem>
                    <SelectItem value="DEAD">{t("status.dead")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_id">{t("createPlant.zoneLabel")}</Label>
            <Controller
              control={control}
              name="zone_id"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("createPlant.selectZone")}>
                      {field.value ? zonesData?.find(z => z.id === field.value)?.name : t("createPlant.selectZone")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("createPlant.noneZone")}</SelectItem>
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
              <Label htmlFor="grid_x">{t("createPlant.gridXLabel")}</Label>
              <Input id="grid_x" type="number" step="any" placeholder={t("createPlant.gridXPlaceholder")} {...register("grid_x")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_y">{t("createPlant.gridYLabel")}</Label>
              <Input id="grid_y" type="number" step="any" placeholder={t("createPlant.gridYPlaceholder")} {...register("grid_y")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planted_at">{t("createPlant.plantedAtLabel")}</Label>
            <Input id="planted_at" type="date" {...register("planted_at")} />
            {errors.planted_at && (
              <p className="text-sm text-destructive">{errors.planted_at.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("createPlant.submitButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
