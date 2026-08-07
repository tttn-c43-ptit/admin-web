"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, MoreHorizontal, Play, CheckCircle2, ChevronLeft, ChevronRight, Edit2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { TaskOut, PaginatedResponse, TaskStatus, User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient as api } from "@/lib/api-client";
import { getUserRole } from "@/lib/jwt";
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
import { TaskCompleteDialog } from "@/components/tasks/task-complete-dialog";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface TasksDataTableProps {
  refreshTrigger?: number;
}

export function TasksDataTable({ refreshTrigger = 0 }: TasksDataTableProps) {
  const [data, setData] = useState<TaskOut[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskOut | null>(null);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<TaskOut | null>(null);

  const { data: staffList } = useQuery<User[]>({
    queryKey: queryKeys.staff(),
    queryFn: () => api.get("api/staff").json(),
  });

  // Pagination and Filtering State
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  // Dialog states
  const [taskToComplete, setTaskToComplete] = useState<TaskOut | null>(null);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `api/tasks?limit=${pageSize}&offset=${pageIndex * pageSize}`;
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get(url).json<PaginatedResponse<TaskOut>>();
      setData(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  const handleStartTask = async (taskId: string) => {
    try {
      await api.put(`api/tasks/${taskId}/start`);
      toast.success("Task started");
      fetchTasks();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to start task");
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.put(`api/tasks/${taskId}`, {
        json: { status: "CANCELLED" }
      });
      toast.success("Task cancelled");
      fetchTasks();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to cancel task");
    }
  };

  const columns: ColumnDef<TaskOut>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <div className="font-medium">{row.getValue("type")}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("description") || ""}>
          {row.getValue("description") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("due_date") as string;
        return date ? format(new Date(date), "MMM d, yyyy HH:mm") : "-";
      },
    },
    {
      accessorKey: "assignee_id",
      header: "Assignee",
      cell: ({ row }) => {
        const assigneeId = row.original.assignee_id;
        if (!assigneeId) return <span className="text-muted-foreground italic text-xs">Unassigned</span>;
        const staff = staffList?.find((s) => s.id === assigneeId);
        return <span className="text-sm font-medium">{staff ? staff.full_name : `${assigneeId.substring(0, 8)}...`}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as TaskStatus;
        const colorMap: Record<TaskStatus, string> = {
          PENDING: "bg-yellow-100 text-yellow-800",
          IN_PROGRESS: "bg-blue-100 text-blue-800",
          DONE: "bg-green-100 text-green-800",
          CANCELLED: "bg-gray-100 text-gray-800",
        };
        return (
          <Badge variant="outline" className={colorMap[status]}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setTaskToView(task);
                    setIsDetailsOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                
                {/* Everyone (Assignee & Owner) can Start/Complete */}
                {task.status === "PENDING" && (
                  <DropdownMenuItem onClick={() => handleStartTask(task.id)}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Task
                  </DropdownMenuItem>
                )}
                {task.status === "IN_PROGRESS" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setIsCompleteOpen(true);
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Task
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setTaskToEdit(task);
                  setIsEditOpen(true);
                }}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                
                {task.status !== "CANCELLED" && task.status !== "DONE" && (
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleCancelTask(task.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TaskStatus | "ALL");
            setPageIndex(0);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No tasks found.
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

      <TaskCompleteDialog
        open={isCompleteOpen}
        onOpenChange={setIsCompleteOpen}
        taskId={selectedTaskId || undefined}
        onSuccess={() => {
          setIsCompleteOpen(false);
          setSelectedTaskId(null);
          toast.success("Task completed");
          fetchTasks();
        }}
      />

      {taskToEdit && (
        <EditTaskDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          task={taskToEdit}
          onSuccess={() => {
            fetchTasks();
            setTaskToEdit(null);
          }}
        />
      )}

      {isDetailsOpen && taskToView && (
        <TaskDetailsDialog
          task={taskToView}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </div>
  );
}
