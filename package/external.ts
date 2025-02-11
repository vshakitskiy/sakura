import type { Return } from "./utils.ts"

export type ErrorHandler<SeedFrom> = (
  { error, seed }: { error: unknown; seed: SeedFrom },
) => Return<Response>

export type BeforeHandler<SeedFrom> = (
  { req, seed }: { req: Request; seed: SeedFrom },
) => Return<Response>

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

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type RecordRaw = {
  [x: string]: any
}

export type StringRecord = Record<string, string>
