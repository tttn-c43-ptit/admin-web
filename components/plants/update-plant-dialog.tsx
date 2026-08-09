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
import { Loader2, AlertCircle, Lock } from "lucide-react";
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

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  UNKNOWN: ["UNKNOWN", "HEALTHY", "WATCHING", "SICK"],
  HEALTHY: ["HEALTHY", "WATCHING", "SICK"],
  WATCHING: ["WATCHING", "HEALTHY", "SICK"],
  SICK: ["SICK", "WATCHING", "HEALTHY", "DEAD"],
  DEAD: ["DEAD"],
};

import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

const statusKeyMap: Record<string, TranslationKey> = {
  UNKNOWN: "status.unknown",
  HEALTHY: "status.healthy",
  WATCHING: "status.watching",
  SICK: "status.sick",
  DEAD: "status.dead",
};

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
  const { t } = useTranslation();
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
      
      toast.success(`Đã cập nhật thông tin cây ${values.code}!`);
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      let errorMessage = "Không thể cập nhật thông tin cây trồng";
      if (error && typeof error === "object" && "response" in error) {
        try {
          const res = (error as { response: Response }).response;
          const body = await res.json();
          if (res.status === 409 || (body && body.detail && body.detail.includes("status transition"))) {
            errorMessage = `Chuyển đổi trạng thái không hợp lệ! Theo quy trình nghiệp vụ: Cây phải ở trạng thái BỊ BỆNH (SICK) mới có thể chuyển sang ĐÃ CHẾT (DEAD), và cây ĐÃ CHẾT không thể chuyển về trạng thái khác.`;
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
          <DialogTitle>Chỉnh sửa cây trồng</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin chi tiết cho mã cây {plant.code}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Mã cây trồng</Label>
            <Input id="code" placeholder="Ví dụ: SR-001" {...register("code")} />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái sức khỏe</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => {
                const allowed = ALLOWED_STATUS_TRANSITIONS[plant.status] || [plant.status];
                const isDeadTerminal = plant.status === "DEAD";

                return (
                  <div className="space-y-1.5">
                    <Select value={field.value} onValueChange={field.onChange} disabled={isDeadTerminal}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("createPlant.selectStatus")}>
                          {field.value ? t(statusKeyMap[field.value] || "status.unknown") : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNKNOWN" disabled={!allowed.includes("UNKNOWN")}>{t("status.unknown")}</SelectItem>
                        <SelectItem value="HEALTHY" disabled={!allowed.includes("HEALTHY")}>{t("status.healthy")}</SelectItem>
                        <SelectItem value="WATCHING" disabled={!allowed.includes("WATCHING")}>{t("status.watching")}</SelectItem>
                        <SelectItem value="SICK" disabled={!allowed.includes("SICK")}>{t("status.sick")}</SelectItem>
                        <SelectItem value="DEAD" disabled={!allowed.includes("DEAD")}>{t("status.dead")}</SelectItem>
                      </SelectContent>
                    </Select>

                    {isDeadTerminal ? (
                      <div className="p-2 rounded bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-center gap-1.5 font-medium">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span>Cây đang ở trạng thái <strong>{t("status.dead")}</strong>. Đây là trạng thái cuối cùng, không thể đổi về trạng thái khác.</span>
                      </div>
                    ) : plant.status !== "SICK" && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>Lưu ý: Cây phải ở trạng thái <strong>{t("status.sick")}</strong> trước khi có thể đổi sang <strong>{t("status.dead")}</strong>.</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_id">Zone (Optional)</Label>
            <Controller
              control={control}
              name="zone_id"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
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
              <Label htmlFor="grid_x">Kinh độ (Longitude)</Label>
              <Input id="grid_x" type="number" step="any" placeholder="Kinh độ" {...register("grid_x")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid_y">Vĩ độ (Latitude)</Label>
              <Input id="grid_y" type="number" step="any" placeholder="Vĩ độ" {...register("grid_y")} />
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
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
