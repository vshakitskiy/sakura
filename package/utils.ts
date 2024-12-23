import type { SafeParseReturnType as SafeParse } from "zod"

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type RecordRaw = {
  [x: string]: any
}

export type OnSchema<T, ZodType, Deafult, Infer> = T extends ZodType
  ? SafeParse<Deafult, Infer>
  : Deafult
