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

export default function InventoryPage() {
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
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`api/inventory/${id}`);
      toast.success("Item deleted successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
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
      header: "Min Quantity",
      cell: ({ row }) => <div className="font-mono">{row.original.min_quantity} {row.original.unit || ""}</div>,
    },
    {
      accessorKey: "expiry_date",
      header: "Expiry",
      cell: ({ row }) => {
        const d = row.original.expiry_date;
        return d ? format(new Date(d), "MMM d, yyyy") : "-";
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
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTransactionItem(item)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> Add Transaction
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHistoryItem(item)}>
                  <ListOrdered className="mr-2 h-4 w-4" /> View Ledger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setEditingItem(item);
                  setFormOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground mt-1">Manage farm supplies, fertilizers, tools</p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={setGardenId} />
          <Button onClick={() => { setEditingItem(null); setFormOpen(true); }} disabled={!gardenId}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {warnings && (warnings.low_stock.length > 0 || warnings.expiring_soon.length > 0 || warnings.expired.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Inventory Warnings</h4>
            <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
              {warnings.low_stock.length > 0 && (
                <li>{warnings.low_stock.length} items are running low on stock.</li>
              )}
              {warnings.expiring_soon.length > 0 && (
                <li>{warnings.expiring_soon.length} items are expiring soon.</li>
              )}
              {warnings.expired.length > 0 && (
                <li>{warnings.expired.length} items have expired.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter by Type:</span>
        <Select value={typeFilter} onValueChange={(val) => { if (val) { setTypeFilter(val); setPageIndex(0); } }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="FERTILIZER">Fertilizer</SelectItem>
            <SelectItem value="PESTICIDE">Pesticide</SelectItem>
            <SelectItem value="TOOL">Tool</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
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
                  Loading...
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
                  No items found.
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
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => old + 1)}
          disabled={pageIndex >= table.getPageCount() - 1 || isLoading}
        >
          Next
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
