"use client";

import { useState, useMemo } from "react";
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
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Plant, Zone } from "@/types";
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
  existingPlants?: Plant[];
}

export function CreatePlantDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
  zonesData,
  existingPlants = [],
}: CreatePlantDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "UNKNOWN",
    },
  });

  const watchCode = watch("code") || "";
  const trimmedCode = watchCode.trim();

  // Check if plant code already exists in garden
  const isCollision = useMemo(() => {
    if (!trimmedCode || !existingPlants.length) return false;
    return existingPlants.some((p) => p.code.toLowerCase() === trimmedCode.toLowerCase());
  }, [trimmedCode, existingPlants]);

  // Compute a smart suggested non-colliding code
  const suggestedCode = useMemo(() => {
    if (!trimmedCode) return "";
    const parts = trimmedCode.split("-");
    const prefix = parts.length > 1 ? parts.slice(0, -1).join("-") : trimmedCode;
    let idx = 1;
    while (idx < 9999) {
      const candidate = `${prefix}-${String(idx).padStart(3, "0")}`;
      if (!existingPlants.some((p) => p.code.toLowerCase() === candidate.toLowerCase())) {
        return candidate;
      }
      idx++;
    }
    return `${trimmedCode}-NEW`;
  }, [trimmedCode, existingPlants]);

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
      
      toast.success(`Đã tạo thành công cây trồng ${values.code}!`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      let errorMessage = "Không thể tạo cây trồng mới";

      if (error && typeof error === "object" && "response" in error) {
        try {
          const res = (error as { response: Response }).response;
          const body = await res.json();
          if (res.status === 409 || (body && body.detail && body.detail.includes("already exist"))) {
            errorMessage = `Cảnh báo trùng mã cây! Mã cây '${values.code}' đã tồn tại trong vườn. Vui lòng đổi mã cây khác.`;
          } else if (body && body.detail) {
            errorMessage = body.detail;
          }
        } catch {
          // fallback
        }
      }

      toast.error(errorMessage, { duration: 6000 });
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
            {isCollision && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col gap-2 font-medium animate-in fade-in-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Mã cây <strong>'{trimmedCode}'</strong> đã tồn tại trong vườn!</span>
                </div>
                {suggestedCode && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                    <span className="text-[11px] text-amber-700">Mã tự do gợi ý: <strong>{suggestedCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => setValue("code", suggestedCode, { shouldValidate: true })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      Dùng mã này
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("createPlant.statusLabel")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
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
                <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("createPlant.selectZone")}>
                      {field.value ? zonesData?.find(z => z.id === field.value)?.name : t("createPlant.noneZone")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("createPlant.noneZone")}</SelectItem>
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
              <Label htmlFor="grid_x">Kinh độ (Longitude)</Label>
              <Input id="grid_x" type="number" step="any" placeholder="Kinh độ (X)" {...register("grid_x")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_y">Vĩ độ (Latitude)</Label>
              <Input id="grid_y" type="number" step="any" placeholder="Vĩ độ (Y)" {...register("grid_y")} />
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
