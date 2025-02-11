import type { Cookies } from "./cookies.ts"
import type { ExtractSchema, Schema, StringRecord } from "./external.ts"
import type { Method, Method as M, Return, SeedMutation } from "./utils.ts"

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

export type Handler<
  Seed,
  Method extends M,
  Body extends Schema = never,
  Params extends Schema = never,
  Query extends Schema = never,
> = (
  arg: ArgByMethod<
    HandlerArg<
      Seed,
      [Params] extends [never] ? StringRecord : ExtractSchema<Params>["output"],
      [Query] extends [never] ? StringRecord : ExtractSchema<Query>["output"],
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
  Params extends Schema,
  Query extends Schema,
> = {
  mutation: SeedMutation<SeedFrom, SeedTo>
  body?: Body
  method: Method
  path: string
  params?: Params
  query?: Query
  handler: Handler<SeedTo, Method, Body, Params, Query>
}

export type PetalAny<SeedFrom = any, SeedTo = any> = Petal<
  SeedFrom,
  SeedTo,
  Method,
  Schema<any, any>,
  Schema<any, any>,
  Schema<any, any>
>
