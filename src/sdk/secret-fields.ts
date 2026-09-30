import type { JsonSchema } from './schema-to-zod.js';

export const SECRET_FIELD =
  /^(key|password|passwd|pass\d*|secret|psk|preshared_?key|private_?key|token|community|app_?key)$/i;

/** String-typed secret property names across object properties and oneOf branches. */
export function secretFieldsOf(schema: JsonSchema | null): string[] {
  const fields = new Set<string>();
  const visit = (current: JsonSchema | undefined): void => {
    if (!current) return;
    for (const [name, property] of Object.entries(current.properties ?? {})) {
      if (SECRET_FIELD.test(name) && property.type === 'string') fields.add(name);
      visit(property);
    }
    for (const branch of current.oneOf ?? []) visit(branch);
    if (current.items) visit(current.items);
  };

  if (schema) visit(schema);
  return [...fields];
}
