export interface ParsedFrontmatter {
  body: string;
  data: Record<string, string>;
}

export function splitFrontmatter(markdown: string): ParsedFrontmatter {
  if (!markdown.startsWith("---")) {
    return { body: markdown, data: {} };
  }

  const firstLineEnd = markdown.indexOf("\n");
  if (firstLineEnd === -1 || markdown.slice(0, firstLineEnd).trim() !== "---") {
    return { body: markdown, data: {} };
  }

  const closingPattern = /\n---\s*(?:\n|$)/;
  const closingMatch = closingPattern.exec(markdown.slice(firstLineEnd));
  if (!closingMatch || closingMatch.index < 0) {
    return { body: markdown, data: {} };
  }

  const frontmatterStart = firstLineEnd + 1;
  const frontmatterEnd = firstLineEnd + closingMatch.index;
  const bodyStart = firstLineEnd + closingMatch.index + closingMatch[0].length;
  const rawFrontmatter = markdown.slice(frontmatterStart, frontmatterEnd);

  return {
    body: markdown.slice(bodyStart),
    data: parseFlatFrontmatter(rawFrontmatter),
  };
}

function parseFlatFrontmatter(raw: string): Record<string, string> {
  const data: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    data[key] = unwrapScalar(rawValue.trim());
  }

  return data;
}

function unwrapScalar(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
