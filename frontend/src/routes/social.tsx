import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/social")({
  component: SocialPage,
});

function SocialPage() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
