// @TODO: fill file with route logic

import type {
  Method as M,
  Return,
  SeedMutation,
  StringRecordDef,
} from "./utils.ts"

export type HandlerArg<Seed, Params, Query, Body> = {
  req: Request
  seed: Seed
  params: Params
  query: Query
  body: Body
}

export type HandlerArgAny<Seed> = HandlerArg<
  Seed,
  StringRecordDef,
  StringRecordDef,
  any
>

export type ArgByMethod<Arg extends HandlerArgAny<unknown>, Method extends M> =
  Method extends "GET" ? Omit<Arg, "body"> : Arg

export type Handler<Seed, Method extends M> = (
  arg: ArgByMethod<HandlerArgAny<Seed>, Method>,
) => Return<Response>

export type Petal<
  SeedFrom,
  SeedTo,
  Method extends M,
> = {
  mutation: SeedMutation<SeedFrom, SeedTo>
  method: Method
  path: string
  handler: Handler<SeedTo, Method>
}

export type PetalAny<SeedFrom = any, SeedTo = any> = Petal<
  SeedFrom,
  SeedTo,
  any
>
