import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/social/$articleId")({
  component: SocialWorkspacePage,
});

function SocialWorkspacePage() {
  const { articleId } = Route.useParams();
  return <div>Hello `/social/${articleId}`!</div>;
}
