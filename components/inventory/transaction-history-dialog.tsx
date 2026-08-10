"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { apiClient as api } from "@/lib/api-client";
import { InventoryItem, InventoryTransaction, PaginatedResponse } from "@/types";
import { Loader2, TrendingUp, TrendingDown, ClipboardList, UserCheck, ShieldCheck, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/i18n-provider";

interface TransactionHistoryDialogProps {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
}

export function TransactionHistoryDialog({
  item,
  onOpenChange,
}: TransactionHistoryDialogProps) {
  const { t } = useTranslation();
  const { data: response, isLoading } = useQuery({
    queryKey: ["inventory", "transactions", item?.id],
    queryFn: () =>
      api.get(`api/inventory/${item?.id}/transactions`).json<PaginatedResponse<InventoryTransaction>>(),
    enabled: !!item,
  });

  const transactions = response?.items || [];

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            Lịch Sử & Sổ Nhật Ký Kho: <span className="font-extrabold">{item?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-2 pr-1 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl border border-emerald-100 bg-white hover:border-emerald-300 transition-colors shadow-sm space-y-3"
                >
                  {/* Top row: Direction badge + Quantity + Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          tx.direction === "IN"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 font-semibold"
                            : "bg-rose-50 text-rose-800 border-rose-300 gap-1 font-semibold"
                        }
                      >
                        {tx.direction === "IN" ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        {tx.direction === "IN" ? "Nhập kho (+)" : "Xuất kho (-)"}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "HH:mm - dd/MM/yyyy", { locale: vi })}
                      </span>
                    </div>

                    <div
                      className={`font-mono font-extrabold text-base ${
                        tx.direction === "IN" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {tx.direction === "IN" ? "+" : "-"}{tx.quantity} {item?.unit || ""}
                    </div>
                  </div>

                  {/* Task liên quan */}
                  {tx.task_title ? (
                    <div className="flex items-center gap-1.5 bg-purple-50 text-purple-900 border border-purple-200 text-xs px-2.5 py-1.5 rounded-lg">
                      <ClipboardList className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="font-semibold">Công việc:</span>
                      <span className="truncate">{tx.task_title}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Xuất/Nhập lẻ (Không gắn công việc cụ thể)
                    </div>
                  )}

                  {/* Nhân sự liên quan: Người nhận, Người duyệt, Người lập */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-dashed border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-muted-foreground">Người nhận:</span>
                      <span className="font-semibold text-gray-900">
                        {tx.recipient_name || "Chưa ghi nhận"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span className="text-muted-foreground">Người duyệt:</span>
                      <span className="font-semibold text-gray-900">
                        {tx.approved_by_name || "Tự động / N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  {tx.note && (
                    <div className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200/60 leading-relaxed">
                      💬 <span className="font-medium">Ghi chú:</span> {tx.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t("ledgerDialog.noTx")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
