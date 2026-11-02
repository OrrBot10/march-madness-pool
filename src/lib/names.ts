const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function split(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  while (parts.length > 2 && SUFFIXES.has(parts[parts.length - 1].toLowerCase().replace(/\.$/, ""))) parts.pop();
  return { first: parts[0] ?? "", last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

export function hasLastName(fullName: string): boolean {
  return split(fullName).last.length > 0;
}

/**
 * How a player appears in standings and on shared pages: first name and last initial ("Josh Orr" -> "Josh O").
 * If that's taken this season, use more of the last name ("Josh Or") until it's unique.
 */
export function displayName(fullName: string, taken: Iterable<string> = []): string {
  const { first, last } = split(fullName);
  if (!last) return first;
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  for (let n = 1; n <= last.length; n++) {
    const candidate = `${first} ${last[0].toUpperCase()}${last.slice(1, n)}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${first} ${last}`;
}
