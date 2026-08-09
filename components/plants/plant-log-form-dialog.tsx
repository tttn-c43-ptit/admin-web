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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

const statusKeyMap: Record<string, TranslationKey> = {
  UNKNOWN: "status.unknown",
  HEALTHY: "status.healthy",
  WATCHING: "status.watching",
  SICK: "status.sick",
  DEAD: "status.dead",
};

const formSchema = z.object({
  status: z.enum(["UNKNOWN", "HEALTHY", "WATCHING", "SICK", "DEAD"] as const),
  note: z.string().max(5000).optional(),
  images: z.array(z.string()).max(10).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PlantLogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantId: string;
  onSuccess: () => void;
}

export function PlantLogFormDialog({
  open,
  onOpenChange,
  plantId,
  onSuccess,
}: PlantLogFormDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "HEALTHY",
      note: "",
      images: [],
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await api.post(`api/plants/${plantId}/logs`, { json: values }).json();
      toast.success("Care log added successfully!");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to add care log");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("plantLog.title")}</DialogTitle>
          <DialogDescription>
            {t("plantLog.desc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">{t("createPlant.statusLabel")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("createPlant.selectStatus")}>
                      {field.value ? t(statusKeyMap[field.value] || "status.unknown") : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEALTHY">{t("status.healthy")}</SelectItem>
                    <SelectItem value="WATCHING">{t("status.watching")}</SelectItem>
                    <SelectItem value="SICK">{t("status.sick")}</SelectItem>
                    <SelectItem value="DEAD">{t("status.dead")}</SelectItem>
                    <SelectItem value="UNKNOWN">{t("status.unknown")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("plantLog.notesLabel")}</Label>
            <Textarea
              id="note"
              placeholder={t("plantLog.notesPlaceholder")}
              className="min-h-[100px]"
              {...register("note")}
            />
            {errors.note && (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("plantLog.photosLabel")}</Label>
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploader
                  value={field.value || []}
                  onChange={field.onChange}
                  maxImages={10}
                />
              )}
            />
            {errors.images && (
              <p className="text-sm text-destructive">{errors.images.message}</p>
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
              {t("plantLog.saveLog")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
