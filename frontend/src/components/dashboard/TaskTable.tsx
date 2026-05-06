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
import { SortableHeader } from "./SortableHeader";
import { FilterSelect } from "./FilterSelect";
import { formatDate, parseTopic } from "@/lib/utils";
import { TaskActions } from "./TaskActions";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";

export interface Task {
  id: string;
  type: string;
  input: string;
  status: string;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

export function TaskTable() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", page, statusFilter, sort, order, typeFilter],
    queryFn: () =>
      getTasks({
        page,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        sort,
        order,
      }),
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground p-4">Loading tasks...</p>
    );
  if (error)
    return <p className="text-sm text-red-500 p-4">Failed to load tasks.</p>;

  function handleSort(field: string) {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  }

  const tasks: Task[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPage: number = data?.totalPage ?? 1;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <FilterSelect
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          placeholder="All statuses"
          options={[
            { value: "pending", label: "Pending" },
            { value: "running", label: "Running" },
            { value: "done", label: "Done" },
            { value: "failed", label: "Failed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <FilterSelect
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
          placeholder="All types"
          options={[{ value: "write_article", label: "Write Article" }]}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <SortableHeader
              label="Status"
              field="status"
              sort={sort}
              order={order}
              onSort={handleSort}
            />
            <SortableHeader
              label="Type"
              field="type"
              sort={sort}
              order={order}
              onSort={handleSort}
            />
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Topic
            </TableHead>
            <SortableHeader
              label="Created"
              field="created_at"
              sort={sort}
              order={order}
              onSort={handleSort}
            />
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-12 text-muted-foreground"
              >
                {statusFilter || typeFilter
                  ? "No tasks match this filter"
                  : "No tasks yet — create one to get started"}
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
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
                <TableCell className="px-4 py-3">
                  <TaskActions task={task} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Showing {tasks.length} of {total} tasks
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            ← Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPage}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
