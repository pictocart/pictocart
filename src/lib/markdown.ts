// Tiny safe markdown renderer — avoids pulling react-markdown into the bundle.
// Supports: # h1 / ## h2 / ### h3, **bold**, *italic*, `code`, links [t](u),
// unordered lists (- ), ordered lists (1. ), blank-line paragraphs, code fences.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s: string) =>
  escape(s)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-primary underline" target="_blank" rel="noreferrer" href="$2">$1</a>');

export const renderMarkdown = (md: string): string => {
  const lines = md.split('\n');
  let html = '';
  let para: string[] = [];
  let list: string[] | null = null;
  let listOrdered = false;
  let inCode = false;
  let codeBuf: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html += `<p class="my-2 leading-relaxed">${inline(para.join(' '))}</p>`;
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = listOrdered ? 'ol' : 'ul';
      const cls = listOrdered ? 'list-decimal pl-6 my-2 space-y-1' : 'list-disc pl-6 my-2 space-y-1';
      html += `<${tag} class="${cls}">${list.map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`;
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith('```')) {
      flushPara(); flushList();
      if (inCode) {
        html += `<pre class="my-2 p-3 rounded bg-muted text-xs overflow-x-auto"><code>${escape(codeBuf.join('\n'))}</code></pre>`;
        codeBuf = []; inCode = false;
      } else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (!line.trim()) { flushPara(); flushList(); continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length;
      const sizes = ['text-2xl font-bold mt-4 mb-2', 'text-xl font-semibold mt-3 mb-2', 'text-base font-semibold mt-2 mb-1'];
      html += `<h${level} class="${sizes[level - 1]}">${inline(h[2])}</h${level}>`;
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const wantOrdered = !!ol;
      if (list && wantOrdered !== listOrdered) flushList();
      list = list ?? [];
      listOrdered = wantOrdered;
      list.push((ul || ol)![1]);
      continue;
    }
    para.push(line);
  }
  flushPara(); flushList();
  if (inCode && codeBuf.length) html += `<pre class="my-2 p-3 rounded bg-muted text-xs overflow-x-auto"><code>${escape(codeBuf.join('\n'))}</code></pre>`;
  return html;
};
