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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editTask, deleteTask } from "@/lib/api";
import { useState } from "react";
import { parseTopic } from "@/lib/utils";
import type { Task } from "./TaskTable";

export function TaskActions({ task }: { task: Task }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editTopic, setEditTopic] = useState(parseTopic(task.input));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates: { status?: string; input?: { topic: string } }) =>
      editTask(task.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
    </>
  );
}
