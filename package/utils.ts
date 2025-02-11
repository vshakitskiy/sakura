/**
 * Contains global utility types and functions.
 * @module
 */

import type { PetalAny } from "./route.ts"
import type { Branch } from "./router.ts"

/**
 * Value in different architecture.
 */
export type Return<Value> = Value | Promise<Value>

/**
 * Request's method.
 */
export type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH"

/**
 * Mutates seed and returns the new form.
 */
export type SeedMutation<From, To> = (
  seed: From,
) => Return<To>

/** Extracts last `Seed` type from the branch. */
export type ExtractSeed<T> = T extends Branch<any, infer Seed, PetalAny> ? Seed
  : never
