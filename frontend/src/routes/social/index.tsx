import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getArticles } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import type { Task } from "@/components/dashboard/TaskTable";

export const Route = createFileRoute("/social/")({
  component: SocialListPage,
});

function SocialListPage() {
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState("desc");

  const { data, isLoading, error } = useQuery({
    queryKey: ["articles", page, order],
    queryFn: () => getArticles({ page, order }),
  });

  const articles: Task[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPage: number = data?.totalPage ?? 1;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Social Media</h1>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <FilterSelect
            value={order}
            onValueChange={(v) => {
              setOrder(v);
              setPage(1);
            }}
            placeholder="Order"
            options={[
              { value: "desc", label: "Newest first" },
              { value: "asc", label: "Oldest first" },
            ]}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground p-4">Loading articles...</p>
        ) : error ? (
          <p className="text-sm text-red-500 p-4">Failed to load articles.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Article
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No articles yet — completed write tasks will appear here
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((article) => (
                  <TableRow key={article.id} className="border-border">
                    <TableCell className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                      {(() => {
                        try {
                          const p = JSON.parse(article.result ?? "");
                          return p.title || article.input;
                        } catch {
                          return article.input;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {article.completed_at ? formatDate(article.completed_at) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      0/4
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Link
                        to="/social/$articleId"
                        params={{ articleId: article.id }}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-foreground text-background rounded-md hover:bg-foreground/90"
                      >
                        promote →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Showing {articles.length} of {total} articles
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
    </div>
  );
}
