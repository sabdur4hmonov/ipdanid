import {
  Car,
  Image as ImageIcon,
  Package,
  PawPrint,
  Users,
} from "lucide-react";
import { SUBJECT_KINDS, type SubjectKind } from "./core/subject-plan";
import type { Locale } from "./core/types";
import { subjectText } from "./subject-i18n";
import "./subject-chooser.css";
const ICONS = {
  people: Users,
  animal: PawPrint,
  vehicle: Car,
  object: Package,
  "whole-image": ImageIcon,
} satisfies Record<SubjectKind, unknown>;
// Large touch targets replace the former <select>; the test id stays on the group.
export function SubjectChooser({
  value,
  locale,
  disabled,
  onChoose,
}: {
  value: SubjectKind;
  locale: Locale;
  disabled?: boolean;
  onChoose: (kind: SubjectKind) => void;
}) {
  const title = subjectText(locale, "title");
  return (
    <fieldset className="subject-chooser" disabled={disabled}>
      <legend>{title}</legend>
      <div
        role="radiogroup"
        aria-label={title}
        data-testid="subject-kind"
        data-value={value}
        className="subject-cards"
        onKeyDown={(e) => {
          const step =
            e.key === "ArrowRight" || e.key === "ArrowDown"
              ? 1
              : e.key === "ArrowLeft" || e.key === "ArrowUp"
                ? -1
                : 0;
          if (!step || disabled) return;
          e.preventDefault();
          const at = SUBJECT_KINDS.indexOf(value),
            next =
              SUBJECT_KINDS[
                (at + step + SUBJECT_KINDS.length) % SUBJECT_KINDS.length
              ];
          onChoose(next);
          e.currentTarget
            .querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)
            ?.focus();
        }}
      >
        {SUBJECT_KINDS.map((kind) => {
          const Icon = ICONS[kind],
            checked = kind === value;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-kind={kind}
              className={`subject-card${checked ? " selected" : ""}`}
              onClick={() => onChoose(kind)}
            >
              <Icon size={26} aria-hidden="true" />
              <strong>{subjectText(locale, kind)}</strong>
              <small>{subjectText(locale, `${kind}-desc`)}</small>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
