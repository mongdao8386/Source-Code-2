'use client';

import { Input, Label, Textarea } from '@/components/ui/Field';
import { TranslateButton } from './TranslateButton';

export type Bag = { vi?: string; en?: string };

/**
 * A bilingual field: Vietnamese is typed, English can be filled from it.
 *
 * This used to exist twice — once in ModelForm, once in SettingsForm — with
 * the settings copy carrying aria-labels the model copy had lost. One
 * component now, so the translate button did not have to be built twice.
 *
 * Translation never overwrites silently: the button is disabled once English
 * has text in it, because the common case for a filled EN box is that someone
 * corrected the machine and does not want it undone by a stray click.
 */
export function TwoLang({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: Bag;
  onChange: (v: Bag) => void;
  textarea?: boolean;
}) {
  const C = textarea ? Textarea : Input;

  const vi = value.vi ?? '';
  const en = value.en ?? '';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <TranslateButton
          source={vi}
          target={en}
          onResult={(english) => onChange({ ...value, en: english })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <C
          aria-label={`${label} VI`}
          placeholder="VI"
          value={vi}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, vi: e.target.value })
          }
        />
        <C
          aria-label={`${label} EN`}
          placeholder="EN"
          value={en}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })
          }
        />
      </div>
    </div>
  );
}
