import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { X, Plus } from "lucide-react";

export function CreateTaskForm() {
  const [type, setType] = useState<TaskType>("write_article");
  const [topic, setTopic] = useState("");
  const [researchFirst, setResearchFirst] = useState(false);
  const [editBeforePublish, setEditBeforePublish] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      type,
      topic,
      research_first,
      edit_before_publish,
      sources,
    }: {
      type: TaskType;
      topic: string;
      research_first?: boolean;
      edit_before_publish?: boolean;
      sources?: string[];
    }) =>
      createTask(type, topic, {
        research_first,
        edit_before_publish,
        sources: sources?.length ? sources : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setType("write_article");
      setTopic("");
      setResearchFirst(false);
      setEditBeforePublish(false);
      setSources([]);
      setNewSource("");
      toast.success("Task created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const runMutation = useMutation({
    mutationFn: runAgents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Agents finished processing");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function addSource() {
    try {
      new URL(newSource);
      setSources([...sources, newSource]);
      setNewSource("");
    } catch {
      toast.error("Please enter a valid URL");
    }
  }

  function removeSource(index: number) {
    setSources(sources.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 10) return;
    mutation.mutate({
      type,
      topic,
      research_first: researchFirst || undefined,
      edit_before_publish: editBeforePublish || undefined,
      sources: sources.length ? sources : undefined,
    });
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

        {type === "write_article" && (
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="research-first"
                checked={researchFirst}
                onCheckedChange={(checked) =>
                  setResearchFirst(checked === true)
                }
              />
              <Label
                htmlFor="research-first"
                className="text-sm cursor-pointer"
              >
                Research first
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-before-publish"
                checked={editBeforePublish}
                onCheckedChange={(checked) =>
                  setEditBeforePublish(checked === true)
                }
              />
              <Label
                htmlFor="edit-before-publish"
                className="text-sm cursor-pointer"
              >
                Edit before publishing
              </Label>
            </div>
          </div>
        )}

        {researchFirst && (
          <div className="mt-2 space-y-2">
            <Label className="text-sm">Sources (optional)</Label>
            {sources.map((url, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {url}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSource(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="https://example.com/article"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSource();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSource}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
