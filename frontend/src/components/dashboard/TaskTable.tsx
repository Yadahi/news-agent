import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTasks } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface Task {
  id: string;
  type: string;
  input: string;
  status: string;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseTopic(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return parsed.topic ?? "—";
  } catch {
    return "—";
  }
}

export function TaskTable() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", page],
    queryFn: () => getTasks(page),
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground p-4">Loading tasks...</p>
    );
  if (error)
    return <p className="text-sm text-red-500 p-4">Failed to load tasks.</p>;

  const tasks: Task[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPage: number = data?.totalPage ?? 1;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Topic
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Created
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="border-border">
              <TableCell className="px-4 py-3">
                <StatusBadge status={task.status} />
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                {task.type}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                {parseTopic(task.input)}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                {formatDate(task.created_at)}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                {task.completed_at ? formatDate(task.completed_at) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Showing {tasks.length} of {total} tasks
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPage}
            className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded ${colors[status] || ""}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
