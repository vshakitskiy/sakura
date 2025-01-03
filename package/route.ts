// @TODO: fill file with route logic

import type {
  Method as M,
  Return,
  SeedMutation,
  StringRecordDef,
} from "./utils.ts"

export type HandlerArg<Seed, Params, Query, Body> = {
  seed: Seed
  params: Params
  query: Query
  body: Body
}

export type Petal<
  SeedFrom,
  SeedTo,
  Method extends M,
> = {
  mutation: SeedMutation<SeedFrom, SeedTo>
  method: Method
  path: string
  handler: (
    arg: HandlerArg<SeedTo, StringRecordDef, StringRecordDef, any>,
  ) => Return<Response>
}

export type PetalAny<SeedFrom = any, SeedTo = any> = Petal<
  SeedFrom,
  SeedTo,
  any
>
