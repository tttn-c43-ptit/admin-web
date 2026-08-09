"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { Zone, Plant } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { useTranslation } from "@/components/i18n-provider";

const formSchema = z.object({
  code_prefix: z.string().min(1, "Prefix is required").max(12, "Max 12 chars"),
  count: z.any().transform((val) => Number(val)),
  start_index: z.any().transform((val) => val ? Number(val) : 1),
  zone_id: z.string().optional(),
  planted_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: () => void;
  zonesData?: Zone[];
  existingPlants?: Plant[];
}

export function BulkGenerateDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
  zonesData,
  existingPlants = [],
}: BulkGenerateDialogProps) {
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
      code_prefix: "SR",
      count: 10,
      start_index: 1,
    },
  });

  const watchPrefix = watch("code_prefix") || "SR";
  const watchCount = Number(watch("count")) || 10;
  const rawStartIndex = watch("start_index");

  // Calculate next available non-colliding index for this prefix
  const nextAvailableIndex = useMemo(() => {
    if (!existingPlants.length) return 1;
    let idx = 1;
    while (idx < 9999) {
      const sampleCode = `${watchPrefix}-${String(idx).padStart(3, '0')}`;
      if (!existingPlants.some(p => p.code.toLowerCase() === sampleCode.toLowerCase())) {
        return idx;
      }
      idx++;
    }
    return 1;
  }, [watchPrefix, existingPlants]);

  // Set default start_index to nextAvailableIndex when dialog opens
  useEffect(() => {
    if (open) {
      setValue("start_index", nextAvailableIndex);
    }
  }, [open, nextAvailableIndex, setValue]);

  // Check collision ONLY if user entered a valid non-empty start_index
  const rawStr = String(rawStartIndex ?? "").trim();
  const hasValidStartIndex = rawStr !== "" && !isNaN(Number(rawStr));
  const watchStartIndex = hasValidStartIndex ? Number(rawStartIndex) : null;

  const sampleStartCode = useMemo(() => {
    if (watchStartIndex === null) return "";
    const lastIndex = watchStartIndex + Math.max(1, watchCount) - 1;
    const width = Math.max(3, String(lastIndex).length);
    return `${watchPrefix}-${String(watchStartIndex).padStart(width, '0')}`;
  }, [watchPrefix, watchStartIndex, watchCount]);

  const isCollision = useMemo(() => {
    if (!hasValidStartIndex || watchStartIndex === null || !sampleStartCode) return false;
    return existingPlants.some(p => p.code.toLowerCase() === sampleStartCode.toLowerCase());
  }, [hasValidStartIndex, watchStartIndex, sampleStartCode, existingPlants]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await api.post(`api/gardens/${gardenId}/plants/bulk`, {
        json: {
          code_prefix: values.code_prefix,
          count: values.count,
          zone_id: values.zone_id || null,
          planted_at: values.planted_at || null,
          start_index: values.start_index,
        },
      }).json();
      
      toast.success(`Đã khởi tạo thành công ${values.count} cây trồng!`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      let errorMessage = "Không thể khởi tạo cây trồng hàng loạt";
      
      if (error && typeof error === "object" && "response" in error) {
        try {
          const res = (error as { response: Response }).response;
          const body = await res.json();
          if (res.status === 409 || (body && body.detail && body.detail.includes("already exist"))) {
            errorMessage = `Cảnh báo trùng mã cây! Chuỗi mã bắt đầu '${sampleStartCode}' đã tồn tại trong vườn. Vui lòng thay đổi Chỉ số bắt đầu hoặc Tiền tố mã.`;
          } else if (body && body.detail) {
            errorMessage = body.detail;
          }
        } catch {
          // fallback to default
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
          <DialogTitle>{t("bulkPlant.title")}</DialogTitle>
          <DialogDescription>
            {t("bulkPlant.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code_prefix">{t("bulkPlant.prefixLabel")}</Label>
            <Input id="code_prefix" placeholder={t("bulkPlant.prefixPlaceholder")} {...register("code_prefix")} />
            {errors.code_prefix && (
              <p className="text-sm text-destructive">{errors.code_prefix.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">{t("bulkPlant.countLabel")}</Label>
            <Input id="count" type="number" placeholder="10" {...register("count")} />
            {errors.count && (
              <p className="text-sm text-destructive">{errors.count.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_index">{t("bulkPlant.startIndexLabel")}</Label>
            <Input id="start_index" type="number" placeholder="1" {...register("start_index")} />
            {errors.start_index && (
              <p className="text-sm text-destructive">{errors.start_index.message}</p>
            )}
            {isCollision && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col gap-2 font-medium animate-in fade-in-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Mã cây <strong>'{sampleStartCode}'</strong> đã tồn tại!</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                  <span className="text-[11px] text-amber-700">Chỉ số tự do tiếp theo: <strong>{nextAvailableIndex}</strong></span>
                  <button
                    type="button"
                    onClick={() => setValue("start_index", nextAvailableIndex, { shouldValidate: true })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    Dùng ngay {nextAvailableIndex}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_id">{t("createPlant.zoneLabel")}</Label>
            <Controller
              control={control}
              name="zone_id"
              render={({ field }) => (
                <Select value={field.value || null} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("createPlant.selectZone")}>
                      {zonesData?.find((z) => z.id === field.value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {zonesData?.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.zone_id && (
              <p className="text-sm text-destructive">{errors.zone_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="planted_at">{t("createPlant.plantedAtLabel")}</Label>
            <Input id="planted_at" type="date" {...register("planted_at")} />
            {errors.planted_at && (
              <p className="text-sm text-destructive">{errors.planted_at.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("bulkPlant.submitButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
