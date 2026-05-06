import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Copy } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editTask, deleteTask } from "@/lib/api";
import { useState } from "react";
import { formatDate, parseTopic } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import type { Task } from "./TaskTable";

export function TaskActions({ task }: { task: Task }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTopic, setEditTopic] = useState(parseTopic(task.input));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates: { status?: string; input?: { topic: string } }) =>
      editTask(task.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewOpen(true)}>
            View
          </DropdownMenuItem>
          {task.status === "pending" && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
          )}
          {task.status === "pending" && (
            <DropdownMenuItem
              onClick={() => mutation.mutate({ status: "cancelled" })}
            >
              Cancel
            </DropdownMenuItem>
          )}
          {(task.status === "failed" || task.status === "cancelled") && (
            <DropdownMenuItem
              onClick={() => mutation.mutate({ status: "pending" })}
            >
              Rerun
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editTopic}
            onChange={(e) => setEditTopic(e.target.value)}
            placeholder="Enter topic"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                mutation.mutate(
                  { input: { topic: editTopic } },
                  { onSuccess: () => setEditOpen(false) },
                );
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Task Details</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex gap-12 py-4 border-b">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Status
                </p>
                <StatusBadge status={task.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Type
                </p>
                <p className="text-sm font-mono">{task.type}</p>
              </div>
            </div>

            <div className="py-4 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Topic
              </p>
              <p className="text-sm">{parseTopic(task.input)}</p>
            </div>

            <div className="py-4 border-b flex gap-12">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Created
                </p>
                <p className="text-sm tabular-nums">
                  {formatDate(task.created_at)}
                </p>
              </div>
              {task.completed_at && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Completed
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatDate(task.completed_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Result
                </p>
                {task.result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(task.result!)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
              {task.result ? (
                (() => {
                  try {
                    const article = JSON.parse(task.result);
                    return (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            By {article.author}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          {article.summary}
                        </p>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {article.body}
                        </div>
                        {article.tags && (
                          <div className="flex gap-2 flex-wrap">
                            {article.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } catch {
                    return (
                      <div className="text-sm whitespace-pre-wrap bg-muted rounded-lg p-4">
                        {task.result}
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="flex items-center justify-center bg-muted/50 rounded-lg p-8">
                  <p className="text-sm text-muted-foreground">
                    {task.status === "pending"
                      ? "Waiting to be processed..."
                      : task.status === "running"
                        ? "Agent is working on this..."
                        : "No result available"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-6 pt-4 border-t">
            {task.status === "failed" || task.status === "cancelled" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutation.mutate({ status: "pending" })}
              >
                Rerun
              </Button>
            ) : (
              <div />
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
