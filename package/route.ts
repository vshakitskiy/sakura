// @TODO: fill file with route logic

import type {
  Method as M,
  Return,
  Schema,
  SeedMutation,
  StringRecordDef,
} from "./utils.ts"
import type { ExtractSchema } from "./utils.ts"

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

export type Handler<Seed, Method extends M, Body extends Schema> = (
  arg: ArgByMethod<
    HandlerArg<
      Seed,
      StringRecordDef,
      StringRecordDef,
      [Body] extends [never] ? any : ExtractSchema<Body>["output"]
    >,
    Method
  >,
) => Return<Response>

export type Petal<
  SeedFrom,
  SeedTo,
  Method extends M,
  Body extends Schema,
> = {
  mutation: SeedMutation<SeedFrom, SeedTo>
  body?: Body
  method: Method
  path: string
  handler: Handler<SeedTo, Method, Body>
}

export type PetalAny<SeedFrom = any, SeedTo = any> = Petal<
  SeedFrom,
  SeedTo,
  any,
  Schema<any, any>
>
