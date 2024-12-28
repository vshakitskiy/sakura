import type { SafeParseReturnType as SafeParse, z, ZodTypeAny } from "zod"

export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

export type RecordRaw = {
  [x: string]: any
}

export type OnSchema<T, ZodType extends ZodTypeAny, Deafult> = T extends ZodType
  ? SafeParse<Deafult, z.infer<T>>
  : Deafult
