import { z } from 'zod';

/**
 * Canonical runtime fact contract. A fact is a piece of information about
 * the user's situation (household, selections, prior answers) that
 * Conditions (WU002) and routing (WU003) read by key. This is the single
 * canonical definition of a fact key and fact value shape; Condition fact
 * references reuse `factKeySchema` rather than declaring their own.
 *
 * Dot-separated names (e.g. `household.municipality`, `services.selected`)
 * are a convention for fact keys, not a structural requirement enforced
 * here.
 *
 * Unknown facts are represented by absence (the key is missing from a
 * FactSet), never by an arbitrary/executable value -- so fact values are
 * restricted to primitives and arrays of primitives.
 *
 * Fact lookup/evaluation is out of scope; this module only defines the
 * shape of a fact key and value.
 */

export const factKeySchema = z.string().min(1);

const factPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

export const factValueSchema = z.union([factPrimitiveSchema, z.array(factPrimitiveSchema)]);

export type FactPrimitive = z.infer<typeof factPrimitiveSchema>;
export type FactValue = z.infer<typeof factValueSchema>;

export const factSetSchema = z.record(factKeySchema, factValueSchema);

export type FactSet = z.infer<typeof factSetSchema>;
