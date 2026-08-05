"use client";

import { useState } from "react";
import { TasksDataTable } from "@/components/tasks/tasks-data-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
        <div className="flex items-center space-x-2">
          <TaskFormDialog
            onSuccess={handleTaskCreated}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            }
          />
        </div>
      </div>
      <TasksDataTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
