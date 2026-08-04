"use client";

import { useState } from "react";
import { TasksDataTable } from "@/components/tasks/tasks-data-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export default function TasksPage() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setIsTaskFormOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
        <div className="flex items-center space-x-2">
          {/* Will pass user role down to TaskFormDialog or conditionally render inside it */}
          <TaskFormDialog
            open={isTaskFormOpen}
            onOpenChange={setIsTaskFormOpen}
            onSuccess={handleTaskCreated}
          />
        </div>
      </div>
      <TasksDataTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
