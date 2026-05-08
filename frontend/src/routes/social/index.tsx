import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/social/")({
  component: SocialListPage,
});

function SocialListPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Social Media</h1>
      <p className="text-muted-foreground mt-2">Coming soon</p>
    </div>
  );
}
