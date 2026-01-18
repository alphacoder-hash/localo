export function parseTagInput(input: string): string[] {
  const tags = input
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

export function formatTags(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}
