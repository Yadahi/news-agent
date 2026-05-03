import { TableHead } from "@/components/ui/table";

export function SortableHeader({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: string;
  sort: string;
  order: string;
  onSort: (field: string) => void;
}) {
  return (
    <TableHead
      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => onSort(field)}
    >
      {label} {sort === field ? (order === "asc" ? "↑" : "↓") : ""}
    </TableHead>
  );
}
