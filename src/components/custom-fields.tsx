"use client";

import type { CustomField } from "@/lib/setup";
import { Field, Input, Select } from "@/components/ui/field";

// Renderiza dinamicamente os campos customizados de um objeto num formulário.
export function CustomFields({
  fields,
  values,
  onChange,
}: {
  fields: CustomField[];
  values: Record<string, any>;
  onChange: (apiName: string, value: any) => void;
}) {
  if (!fields.length) return null;
  return (
    <div className="space-y-3 border-t border-border pt-3">
      {fields.map((f) => {
        const v = values[f.api_name] ?? "";
        const label = f.required ? `${f.label} *` : f.label;

        if (f.type === "checkbox") {
          return (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(values[f.api_name])}
                onChange={(e) => onChange(f.api_name, e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--brand))]"
              />
              {label}
            </label>
          );
        }

        return (
          <Field key={f.id} label={label}>
            {f.type === "textarea" ? (
              <textarea
                value={v}
                onChange={(e) => onChange(f.api_name, e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
              />
            ) : f.type === "picklist" ? (
              <Select value={v} onChange={(e) => onChange(f.api_name, e.target.value)}>
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            ) : (
              <Input
                type={f.type === "number" || f.type === "currency" ? "text" : f.type === "date" ? "date" : f.type === "url" ? "url" : f.type === "phone" ? "tel" : "text"}
                inputMode={f.type === "number" || f.type === "currency" ? "decimal" : undefined}
                value={v}
                onChange={(e) => onChange(f.api_name, e.target.value)}
                placeholder={f.help ?? ""}
              />
            )}
            {f.help && f.type !== "text" && <span className="text-xs text-muted">{f.help}</span>}
          </Field>
        );
      })}
    </div>
  );
}
