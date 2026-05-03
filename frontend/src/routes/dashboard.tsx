import { CreateTaskForm } from "@/components/dashboard/CreateTaskForm";
import TaskTable from "@/components/dashboard/TaskTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold p-4">News Agent Dashboard</h1>
      <p className="text-muted-foreground mb-4">
        Manage and monitor your automated news processing tasks.
      </p>
      <CreateTaskForm />
      <TaskTable />
    </DashboardLayout>
  );
}
