export function formatValue(value: number | null | undefined, format: string, currency = "USD"): string {
  if (value == null || isNaN(value as number)) return "—";
  const v = Number(value);
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
    case "percentage":
      return `${(v * (Math.abs(v) <= 1 ? 100 : 1)).toFixed(1)}%`;
    case "number":
    default:
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `c-${Date.now().toString(36)}`;
}
