'use client';

import { useState } from 'react';
import {
  MODEL_TEMPLATE,
  formatModelTemplate,
  parseModelTemplate,
  type ParsedModel,
  type TemplateCategory,
} from '@/lib/model-template';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';

type Source = Parameters<typeof formatModelTemplate>[0];

/**
 * The text form of a profile, on the edit page.
 *
 * "Sao chép dạng văn bản" puts the saved profile on the clipboard as the same
 * block the quick-add page takes, so a new model that is mostly like an old
 * one is a copy, a few edits and a paste. "Dán từ mẫu" goes the other way:
 * paste over an existing profile and only the lines present in the paste
 * change — a blank template line touches nothing.
 */
export function TemplateTools({
  value,
  categories,
  onApply,
}: {
  value: Source;
  categories: TemplateCategory[];
  onApply: (p: ParsedModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatModelTemplate(value, categories));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused; the textarea below is the fallback.
      setText(formatModelTemplate(value, categories));
      setOpen(true);
    }
  }

  const parsed = open && text.trim() ? parseModelTemplate(text, categories) : null;

  return (
    <div className="border border-line bg-surface-1/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="kicker">Văn bản theo mẫu</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? 'Đã sao chép' : 'Sao chép dạng văn bản'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={open ? 'ghost' : 'outline'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Đóng' : 'Dán từ mẫu'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={MODEL_TEMPLATE}
            className="font-mono text-xs leading-relaxed"
            aria-label="Dán văn bản theo mẫu"
          />
          {parsed && parsed.warnings.length > 0 && (
            <ul className="space-y-1 text-xs text-amber-300/90">
              {parsed.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={!parsed}
              onClick={() => {
                if (!parsed) return;
                onApply(parsed);
                setOpen(false);
                setText('');
              }}
            >
              Điền vào form
            </Button>
            <span className="text-xs text-bone-faint">
              Chỉ các dòng có nội dung mới ghi đè. Nhớ bấm Lưu sau khi điền.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
