// What a WhatsApp message looks like in the page: *bold* in bold, and the
// "> " quote lines in a quote box.
export default function WaText({ text }) {
  const bold = (line) => line.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <b key={i}>{part.slice(1, -1)}</b> : part);
  const blocks = [];
  for (const line of text.split("\n")) {
    const quote = line.startsWith("> ");
    const last = blocks[blocks.length - 1];
    if (quote && last?.quote) last.lines.push(line.slice(2));
    else blocks.push({ quote, lines: [quote ? line.slice(2) : line] });
  }
  return blocks.map((b, i) => b.quote
    ? <div key={i} className="border-s-4 border-adm-line bg-adm-surface/60 rounded-md px-2.5 py-1.5 my-1">{b.lines.map((l, j) => <div key={j}>{bold(l)}</div>)}</div>
    : <div key={i} className="min-h-[1em]">{bold(b.lines[0])}</div>);
}
