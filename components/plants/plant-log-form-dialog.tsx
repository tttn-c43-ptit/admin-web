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
          <DialogTitle>Add Care Log</DialogTitle>
          <DialogDescription>
            Record the current status of the plant, add notes, and attach photos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Plant Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEALTHY">Healthy</SelectItem>
                    <SelectItem value="WATCHING">Watching</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="DEAD">Dead</SelectItem>
                    <SelectItem value="UNKNOWN">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              placeholder="e.g. Applied fertilizer today..."
              className="min-h-[100px]"
              {...register("note")}
            />
            {errors.note && (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Photos</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
