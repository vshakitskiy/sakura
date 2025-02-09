/**
 * Contains utility types and functions.
 * @module
 */

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type RecordRaw = {
  [x: string]: any
}

/**
 * Value in different architecture
 */
export type Return<Value> = Value | Promise<Value>
export type StringRecord = Record<string, string>

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

export interface Schema<Output = any, Input = Output> {
  parse: (value: unknown) => Output
  _input: Input
}

export type ExtractSchema<T> = T extends Schema<
  infer Output,
  infer Input
> ? {
    output: Output
    input: Input
  }
  : never

// @TODO: docs
export const toSchema = <T>(parse: (value: unknown) => T): Schema<T, T> => {
  return {
    parse,
  } as Schema<T, T>
}
