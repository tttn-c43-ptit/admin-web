"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Plus, AlertTriangle, ListOrdered, ArrowLeftRight, Edit, Trash2 } from "lucide-react";
import { InventoryItem, PaginatedResponse, InventoryWarnings, ItemType } from "@/types";
import { apiClient as api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { GardenSelector } from "@/components/dashboard/garden-selector";
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog";
import { TransactionDialog } from "@/components/inventory/transaction-dialog";
import { TransactionHistoryDialog } from "@/components/inventory/transaction-history-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

export default function InventoryPage() {
  const { t } = useTranslation();
  const [gardenId, setGardenId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Fetch warnings
  const { data: warnings } = useQuery({
    queryKey: ["inventory", gardenId, "warnings"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/inventory/warnings`).json<InventoryWarnings>(),
    enabled: !!gardenId,
  });

  // Fetch inventory
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ["inventory", gardenId, typeFilter, pageIndex],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (pageIndex * pageSize).toString(),
      });
      if (typeFilter !== "ALL") {
        searchParams.append("type", typeFilter);
      }
      return api.get(`api/gardens/${gardenId}/inventory?${searchParams.toString()}`).json<PaginatedResponse<InventoryItem>>();
    },
    enabled: !!gardenId,
  });

  const handleDelete = async (id: string) => {
    if (!confirm(t("inventory.deleteConfirm"))) return;
    try {
      await api.delete(`api/inventory/${id}`);
      toast.success("Đã xóa vật tư thành công");
      refetch();
    } catch (err) {
      toast.error("Không thể xóa vật tư");
    }
  };

  const invTypeKeyMap: Record<ItemType, TranslationKey> = {
    FERTILIZER: "invType.FERTILIZE",
    PESTICIDE: "invType.PESTICIDE",
    TOOL: "invType.TOOL",
    OTHER: "invType.OTHER",
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: t("inventory.colName"),
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "type",
      header: t("inventory.colType"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {t(invTypeKeyMap[row.original.type] || "invType.OTHER")}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: t("inventory.colQuantity"),
      cell: ({ row }) => {
        const isLow = row.original.quantity < row.original.min_quantity;
        return (
          <div className={`font-mono ${isLow ? 'text-red-500 font-bold' : ''}`}>
            {row.original.quantity} {row.original.unit || ""}
          </div>
        );
      },
    },
    {
      accessorKey: "min_quantity",
      header: t("inventory.colMinQuantity"),
      cell: ({ row }) => <div className="font-mono">{row.original.min_quantity} {row.original.unit || ""}</div>,
    },
    {
      accessorKey: "expiry_date",
      header: t("inventory.colExpiry"),
      cell: ({ row }) => {
        const d = row.original.expiry_date;
        return d ? format(new Date(d), "dd/MM/yyyy") : "-";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="h-8 w-8 p-0" />
            }>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("inventory.colActions")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTransactionItem(item)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> {t("inventory.addTransaction")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHistoryItem(item)}>
                  <ListOrdered className="mr-2 h-4 w-4" /> {t("inventory.viewLedger")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setEditingItem(item);
                  setFormOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" /> {t("action.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> {t("action.delete")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: inventoryData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: inventoryData ? Math.ceil(inventoryData.total / pageSize) : -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("inventory.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("inventory.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={setGardenId} />
          <Button onClick={() => { setEditingItem(null); setFormOpen(true); }} disabled={!gardenId}>
            <Plus className="mr-2 h-4 w-4" /> {t("inventory.addItem")}
          </Button>
        </div>
      </div>

      {warnings && (warnings.low_stock.length > 0 || warnings.expiring_soon.length > 0 || warnings.expired.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">{t("inventory.warningsTitle")}</h4>
            <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
              {warnings.low_stock.length > 0 && (
                <li>{t("inventory.warnLowStock").replace("{count}", String(warnings.low_stock.length))}</li>
              )}
              {warnings.expiring_soon.length > 0 && (
                <li>{t("inventory.warnExpiring").replace("{count}", String(warnings.expiring_soon.length))}</li>
              )}
              {warnings.expired.length > 0 && (
                <li>{t("inventory.warnExpired").replace("{count}", String(warnings.expired.length))}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t("inventory.filterTypeLabel")}</span>
        <Select value={typeFilter} onValueChange={(val) => { if (val) { setTypeFilter(val); setPageIndex(0); } }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("inventory.allTypes")}</SelectItem>
            <SelectItem value="FERTILIZER">{t("invType.FERTILIZE")}</SelectItem>
            <SelectItem value="PESTICIDE">{t("invType.PESTICIDE")}</SelectItem>
            <SelectItem value="TOOL">{t("invType.TOOL")}</SelectItem>
            <SelectItem value="OTHER">{t("invType.OTHER")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("inventory.loading")}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("inventory.noItems")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => Math.max(old - 1, 0))}
          disabled={pageIndex === 0 || isLoading}
        >
          {t("action.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => old + 1)}
          disabled={pageIndex >= table.getPageCount() - 1 || isLoading}
        >
          {t("action.next")}
        </Button>
      </div>

      {gardenId && (
        <InventoryFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          gardenId={gardenId}
          itemToEdit={editingItem}
          onSuccess={() => { setFormOpen(false); refetch(); }}
        />
      )}

      {transactionItem && (
        <TransactionDialog 
          item={transactionItem}
          onOpenChange={(open: boolean) => !open && setTransactionItem(null)}
          onSuccess={() => { setTransactionItem(null); refetch(); }}
        />
      )}

      {historyItem && (
        <TransactionHistoryDialog
          item={historyItem}
          onOpenChange={(open: boolean) => !open && setHistoryItem(null)}
        />
      )}
    </div>
  );
}
