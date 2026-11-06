import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import WaText from "@/components/admin/WaText";
import {
  TEMPLATES, TEMPLATE_GROUPS, messageLocale, templateText, originalText, isEdited, sampleMessage, templateProblems,
} from "@/components/admin/messageTemplates";
import { PageHeader, Card, Segmented, SectionTitle, Panel, ConfirmBox, btn, useToast, labelCls, IconChevron } from "@/components/admin/ui";

const LOCALES = [{ value: "ckb", label: "Kurdish" }, { value: "ar", label: "Arabic" }];
const localeName = (locale) => LOCALES.find((l) => l.value === locale).label;

function TemplateEditor({ template, locale, onClose }) {
  const save = useMutation(api.messageTemplates.save);
  const reset = useMutation(api.messageTemplates.reset);
  const toast = useToast();
  const box = useRef(null);
  const start = templateText(template.key, locale);
  const original = originalText(template.key, locale);
  const [text, setText] = useState(start);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { unknown, missing } = templateProblems(template, text);
  const canSave = text.trim() && text.trim() !== start && !unknown.length && !missing.length;
  const label = template.title;

  // Puts {name} where the cursor is.
  function insert(name) {
    const el = box.current;
    const at = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? at;
    const piece = `{${name}}`;
    setText(text.slice(0, at) + piece + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + piece.length, at + piece.length); });
  }

  async function run(action, done) {
    setBusy(true);
    try {
      await action();
      toast(done);
      onClose();
    } catch (err) {
      toast(errorMessage(err, "Couldn't save the message"), "error");
      setBusy(false);
    }
  }
  const backToOriginal = () => run(() => reset({ key: template.key, locale, label }), "Back to the original message");
  // Typing the original wording back is the same as going back to it.
  const onSave = () => (text.trim() === original
    ? backToOriginal()
    : run(() => save({ key: template.key, locale, body: text, label }), "Message saved"));

  return (
    <Panel open onClose={onClose} closeOnBackdrop={false} title={template.title} subtitle={`${localeName(locale)} · ${template.when}`}
      footer={confirmReset ? null : (
        <div className="flex gap-2 w-full">
          <button type="button" onClick={onClose} className={`${btn("outline")} flex-1`}>Cancel</button>
          <button type="button" onClick={onSave} disabled={!canSave || busy} className={`${btn("dark")} flex-1`}>{busy ? "Saving…" : "Save"}</button>
        </div>
      )}>
      <div>
        <label htmlFor="template-text" className={labelCls}>Message</label>
        <textarea id="template-text" ref={box} dir="rtl" rows={template.vars.length ? 10 : 4} value={text} onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-adm-line bg-adm-surface p-3 text-[14px] leading-relaxed text-adm-ink outline-none focus:border-adm-fade" />
        {unknown.length > 0 && <p className="text-[12.5px] font-semibold text-st-rejected mt-1">We can't fill in: {unknown.map((n) => `{${n}}`).join(", ")}. Fix or remove it.</p>}
        {missing.length > 0 && <p className="text-[12.5px] font-semibold text-st-rejected mt-1">This message needs: {missing.map((n) => `{${n}}`).join(", ")}. Tap it below to add it back.</p>}
      </div>

      {template.vars.length > 0 && (
        <div>
          <p className={labelCls}>Filled in for each message. Tap to add.</p>
          <div className="flex flex-wrap gap-1.5">
            {template.vars.map((x) => (
              <button key={x.name} type="button" onClick={() => insert(x.name)}
                className="h-8 px-2.5 rounded-lg border border-adm-line bg-adm-surface text-[12px] font-semibold text-adm-ink hover:bg-adm-sunk">
                {x.hint}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className={labelCls}>Preview with an example post</p>
        <div dir="rtl" className="rounded-2xl rounded-es-md bg-st-approved-bg px-3.5 py-3 text-[13px] leading-relaxed text-adm-ink overflow-hidden [overflow-wrap:anywhere]">
          <WaText text={sampleMessage(template, text)} />
        </div>
      </div>

      {isEdited(template.key, locale) && (confirmReset ? (
        <ConfirmBox tone="neutral" busy={busy} title="Go back to the original message?" text="Your wording of this message will be removed."
          confirmLabel="Use the original" onConfirm={backToOriginal} onCancel={() => setConfirmReset(false)} />
      ) : (
        <button type="button" onClick={() => setConfirmReset(true)} className={`${btn("ghost")} w-full`}>Go back to the original message</button>
      ))}
    </Panel>
  );
}

// Every WhatsApp message the admin sends, to read and reword at any time. The
// next message sent uses the new wording.
export default function AdminTemplatesPage() {
  const [locale, setLocale] = useState(messageLocale);
  const [open, setOpen] = useState(null);
  return (
    <div>
      <PageHeader title="Message templates" sub="Tap a message to read or change it. New messages use your wording right away." />
      <Segmented options={LOCALES} value={locale} onChange={setLocale} className="mb-5 max-w-xs" />
      <div className="space-y-6">
        {TEMPLATE_GROUPS.map((group) => (
          <section key={group.key}>
            <SectionTitle>{group.title}</SectionTitle>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {TEMPLATES.filter((t) => t.group === group.key).map((t) => (
                <button key={t.key} type="button" onClick={() => setOpen(t)} className="text-start min-w-0">
                  <Card className="p-3.5 h-full flex items-center gap-3 hover:bg-adm-sunk/60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14.5px] font-bold truncate">{t.title}</p>
                        {isEdited(t.key, locale) && <span className="shrink-0 rounded-full bg-adm-accent-soft text-adm-accent px-2 py-0.5 text-[10.5px] font-bold">Changed</span>}
                      </div>
                      <p className="text-[12px] text-adm-soft truncate">{t.when}</p>
                      <p dir="rtl" className="text-[12.5px] text-adm-fade mt-1.5 line-clamp-2 whitespace-pre-line">
                        {templateText(t.key, locale).replace(/\*/g, "")}
                      </p>
                    </div>
                    <IconChevron className="w-4 h-4 text-adm-fade shrink-0 rtl:rotate-180" />
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {open && <TemplateEditor key={`${open.key}:${locale}`} template={open} locale={locale} onClose={() => setOpen(null)} />}
    </div>
  );
}
