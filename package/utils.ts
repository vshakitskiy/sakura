// import type { SafeParseReturnType as SafeParse, z, ZodTypeAny } from "zod"

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type RecordRaw = {
  [x: string]: any
}

// export type OnSchema<T, ZodType extends ZodTypeAny, Deafult> = T extends ZodType
//   ? SafeParse<Deafult, z.infer<T>>
//   : Deafult

export type Return<Value> = Value | Promise<Value>
export type AnyRecordDef = Record<string, any>
export type StringRecordDef = Record<string, string>

/**
 * Request's method.
 */
export type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH"

/**
 * Mutates seed and returns it.
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

export const toSchema = <T>(parse: (value: unknown) => T): Schema<T, T> => {
  return {
    parse,
  } as Schema<T, T>
}
