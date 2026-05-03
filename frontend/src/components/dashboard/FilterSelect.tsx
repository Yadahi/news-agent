import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}

export function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: FilterSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v === "all" ? "" : v)}
    >
      <SelectTrigger className="w-[160px] text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
