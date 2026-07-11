import { useId, type ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export interface FormFieldControlProps {
  id: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: true;
  disabled?: boolean;
  required?: boolean;
}

export interface FormFieldProps {
  label: string;
  renderControl: (props: FormFieldControlProps) => ReactNode;
  id?: string;
  name?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  labelHidden?: boolean;
}

export function FormField({
  label,
  renderControl,
  id,
  name,
  description,
  error,
  disabled = false,
  required = false,
  labelHidden = false,
}: FormFieldProps) {
  const generatedId = useId().replaceAll(":", "");
  const controlId = id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={Boolean(error) || undefined} data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={controlId} className={labelHidden ? "sr-only" : undefined}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </FieldLabel>
      {renderControl({
        id: controlId,
        name,
        "aria-describedby": describedBy,
        "aria-errormessage": errorId,
        "aria-invalid": error ? true : undefined,
        disabled,
        required,
      })}
      {description ? (
        <FieldDescription id={descriptionId} className="font-body">
          {description}
        </FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
