/**
 * Contains types related to routes.
 * @module
 */

import type { Cookies } from "./cookies.ts"
import type {
  Method,
  Method as M,
  Return,
  Schema,
  SeedMutation,
  StringRecord,
} from "./utils.ts"
import type { ExtractSchema } from "./utils.ts"

export type HandlerArg<Seed, Params, Query, Body> = {
  req: Request
  seed: Seed
  params: Params
  query: Query
  body: Body
  cookies: Cookies
}

export type HandlerArgAny<Seed> = HandlerArg<
  Seed,
  StringRecord,
  StringRecord,
  any
>

export type ArgByMethod<Arg extends HandlerArgAny<unknown>, Method extends M> =
  Method extends "GET" ? Omit<Arg, "body"> : Arg

export type Handler<Seed, Method extends M, Body extends Schema = never> = (
  arg: ArgByMethod<
    HandlerArg<
      Seed,
      StringRecord,
      StringRecord,
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
  Method,
  Schema<any, any>
>
