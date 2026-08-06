"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

const formSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().gt(0, "Quantity must be greater than 0"),
  note: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TransactionDialog({
  item,
  onOpenChange,
  onSuccess,
}: TransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      direction: "IN",
      quantity: 1,
      note: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        direction: "IN",
        quantity: 1,
        note: "",
      });
    }
  }, [item, form]);

  const onSubmit = async (values: FormValues) => {
    if (!item) return;
    
    // Prevent over-withdrawing
    if (values.direction === "OUT" && values.quantity > item.quantity) {
      const msg = `Cannot withdraw more than available stock (${item.quantity} ${item.unit || ""})`;
      form.setError("quantity", { type: "manual", message: msg });
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`api/inventory/${item.id}/transactions`, {
        json: {
          ...values,
          note: values.note || null,
        },
      });
      toast.success("Transaction recorded");
      onSuccess();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || "Failed to record transaction";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Stock Transaction: {item?.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="bg-muted/50 p-3 rounded-md mb-4 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className="font-mono font-medium">{item?.quantity} {item?.unit || ""}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.clearErrors("quantity");
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IN">Add Stock (IN)</SelectItem>
                        <SelectItem value="OUT">Withdraw (OUT)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="0"
                          className="pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={field.value === 0 ? "" : field.value}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? 0 : parseFloat(val) || 0);
                            form.clearErrors("quantity");
                          }}
                        />
                        {item?.unit && (
                          <div className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none select-none">
                            {item.unit}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. Received from supplier, used for Zone A..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Record
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
