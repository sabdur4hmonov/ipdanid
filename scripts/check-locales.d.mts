export type VisibleLiteral = {
  file: string;
  line: number;
  kind: string;
  text: string;
};
export type LocaleAudit = {
  errors: string[];
  dictionaries: { file: string; label: string; keys: number; form: string }[];
  literals: VisibleLiteral[];
};
export function auditLocaleSource(source: string, file?: string): LocaleAudit;
export function auditLocales(root?: string): LocaleAudit;
export function auditVisibleLiterals(literals: VisibleLiteral[]): string[];
