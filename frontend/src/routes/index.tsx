import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const token = localStorage.getItem("token");
    throw redirect({ to: token ? "/dashboard" : "/login" });
  },
});
