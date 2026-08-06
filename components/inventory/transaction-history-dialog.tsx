"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem, InventoryTransaction, PaginatedResponse } from "@/types";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionHistoryDialogProps {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
}

export function TransactionHistoryDialog({
  item,
  onOpenChange,
}: TransactionHistoryDialogProps) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["inventory", "transactions", item?.id],
    queryFn: () =>
      api.get(`api/inventory/${item?.id}/transactions`).json<PaginatedResponse<InventoryTransaction>>(),
    enabled: !!item,
  });

  const transactions = response?.items || [];

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ledger: {item?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${
                      tx.direction === "IN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {tx.direction === "IN" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {tx.direction === "IN" ? "Stock Added" : "Stock Withdrawn"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                      </div>
                      {tx.note && (
                        <div className="text-sm mt-2 text-muted-foreground bg-muted p-2 rounded">
                          {tx.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`font-mono font-bold ${
                    tx.direction === "IN" ? "text-green-600" : "text-red-600"
                  }`}>
                    {tx.direction === "IN" ? "+" : "-"}{tx.quantity} {item?.unit || ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No transactions recorded yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
