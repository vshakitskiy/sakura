/**
 * Contains global utility types and functions.
 * @module
 */

import type { Cookies } from "./cookies.ts"
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
export type SeedMutation<From, To> = (seed: From) => Return<To>

/** Extracts last `Seed` type from the branch. */
export type ExtractSeed<T> =
  T extends Branch<any, infer Seed, PetalAny> ? Seed : never

export type ErrorHandler<SeedFrom> = ({
  error,
  seed,
}: {
  error: unknown
  seed: SeedFrom
}) => Return<Response>

type MinHandler<SeedFrom> = ({
  req,
  cookies,
  seed,
}: {
  req: Request
  cookies: Cookies
  seed: SeedFrom
}) => Return<Response>

export type UnknownHandler<SeedFrom> = MinHandler<SeedFrom>

export type UnsupportedHandler<SeedFrom> = MinHandler<SeedFrom>

export type BeforeHandler<SeedFrom, B> = ({
  req,
  cookies,
  seed,
}: {
  req: Request
  cookies: Cookies
  seed: SeedFrom
}) => Return<B>

export type AfterHandler<B> = ({
  res,
  before,
}: {
  res: Response
  before: B
}) => Return<Response>
