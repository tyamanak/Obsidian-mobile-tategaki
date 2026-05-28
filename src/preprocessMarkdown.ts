export function preprocessMarkdown(
  markdown: string,
  options: { renderExplicitTcy: boolean; renderAozoraRuby: boolean },
): string {
  let next = markdown;

  if (options.renderExplicitTcy) {
    next = renderExplicitTcy(next);
  }

  if (options.renderAozoraRuby) {
    next = renderAozoraRuby(next);
  }

  return next;
}

function renderExplicitTcy(markdown: string): string {
  return markdown.replace(/｟([^｠\n]{1,4})｠/g, (_match, text: string) => {
    return `<span class="vreader-tcy">${escapeHtml(text)}</span>`;
  });
}

function renderAozoraRuby(markdown: string): string {
  return markdown.replace(/｜([^《\n]+)《([^》\n]+)》/g, (_match, base: string, ruby: string) => {
    return `<ruby>${escapeHtml(base)}<rt>${escapeHtml(ruby)}</rt></ruby>`;
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
