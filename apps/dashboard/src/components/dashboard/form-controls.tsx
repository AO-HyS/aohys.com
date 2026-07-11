import { FormField } from "@/components/dashboard/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function LabeledInput({
  label,
  value,
  onValueChange,
  placeholder,
  description,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      renderControl={(controlProps) => (
        <Input
          {...controlProps}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    />
  );
}

export function LabeledTextarea({
  label,
  value,
  onValueChange,
  rows = 4,
  description,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  description?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      disabled={disabled}
      renderControl={(controlProps) => (
        <Textarea
          {...controlProps}
          value={value}
          rows={rows}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    />
  );
}

export function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  description,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      label={label}
      description={description}
      disabled={disabled}
      renderControl={(controlProps) => (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger {...controlProps} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    />
  );
}
