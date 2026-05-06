import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { createTask, type TaskType } from "@/lib/api";
import { runAgents } from "@/lib/api";
import { toast } from "sonner";

export function CreateTaskForm() {
  const [type, setType] = useState<TaskType>("write_article");
  const [topic, setTopic] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ type, topic }: { type: TaskType; topic: string }) =>
      createTask(type, topic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setType("write_article");
      setTopic("");
    },
    onError: () => {},
  });

  const runMutation = useMutation({
    mutationFn: runAgents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Agents finished processing");
    },
    onError: (error) => {
      console.log("Run error:", error);
      toast.error(error.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 10) return;
    // TODO: call createTask mutation
    console.log("Create task:", { type, topic });
    mutation.mutate({ type, topic });
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-6">
      <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
        New Assignment
      </h3>
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <div className="w-48">
            <Label>Agent</Label>
          </div>
          <div className="flex-1">
            <Label htmlFor="topic">Topic</Label>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="write_article">Write Article</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Grand Opening of Sunrise Bakery on Main Street, Halifax, May 2026"
            rows={2}
            className="flex-1"
          />
          <Button type="submit">Assign Task</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            {runMutation.isPending ? "Running..." : "Run Agents"}
          </Button>
        </div>
      </div>
    </form>
  );
}
