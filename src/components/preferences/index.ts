// GSD Vibe - Preferences index
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

export { PreferencesForm } from './preferences-form';
export type { PreferencesFormProps } from './preferences-form';
export {
  ScopeBadge, Section, FieldRow,
  ToggleField, SelectField, NumberField, TextField,
  StringArrayField, LinesArrayField, HookEditor,
  ComboboxField, ModelComboboxField, SkillTagField, NotificationsGrid,
  getStr, getBool, getNum, getArr, scopeOf, setDraftField,
  KNOWN_UNIT_TYPES, KNOWN_SKILLS,
} from './preferences-primitives';
export type { ScopeOrigin } from './preferences-primitives';
