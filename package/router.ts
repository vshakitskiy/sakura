/**
 * Contains functions/classes related to working with routers.
 *
 * @example
 * ```ts
 * import { Branch } from "@vsh/sakura"
 *
 * const match = Branch.create<{ req: Request }>()
 *  .get("/ping", () => fall(200, { message: "pong" }))
 *  .match("GET", "/ping")
 *
 * @module
 * ```
 */

import type {
  SafeParseReturnType as SafeParse,
  z,
  ZodObject,
  ZodRawShape as RawShape,
  ZodTypeAny as ZodAny,
} from "zod"
import type { OnSchema, PartialRecord, RecordRaw } from "./utils.ts"

type ZodRecordRaw = ZodObject<RawShape>

export type ExtractSeed<T> = T extends Branch<any, infer CurrSeed> ? CurrSeed
  : never

/**
 * Request's method.
 */
export type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH"

/**
 * Mutates seed and returns it.
 */
export type Mutation<From, To> = (
  seed: From,
) => To | Promise<To>

type PetalMeta<
  CurrSeed,
  Params,
  Query,
  Body,
> = {
  req: Request
  seed: CurrSeed
  params: Params
  query: Query
  json: Body
}

/**
 * Function with the metadata of the request: params, query, body json and last mutated seed.
 * If Zod schemas provided, metadata contains result of metadata's parsing.
 */
export type Petal<
  CurrSeed,
  Params = SafeParse<RecordRaw, RecordRaw> | RecordRaw,
  Query = SafeParse<RecordRaw, RecordRaw> | RecordRaw,
  Body = SafeParse<any, any> | RecordRaw,
  Meta = PetalMeta<CurrSeed, Params, Query, Body>,
> = (
  meta: Meta,
) => Promise<Response> | Response

/**
 * Contains the last mutation and response function
 */
export type Handler<InitSeed, CurrSeed> = {
  petal: Petal<CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>
  z?: {
    params?: ZodRecordRaw
    query?: ZodRecordRaw
    body?: ZodAny
  }
}

/**
 * Represents handlers as a tree.
 */
export type HandlersTree<InitSeed, CurrSeed> = {
  next: Record<string, HandlersTree<InitSeed, CurrSeed>>
  handler?: PartialRecord<Method, Handler<InitSeed, CurrSeed>>
  param?: string
}

type BranchMethod<InitSeed, CurrSeed, Method> = <
  Params extends ZodRecordRaw,
  Query extends ZodRecordRaw,
  Body extends ZodAny,
  ParamsParse = OnSchema<Params, ZodRecordRaw, RecordRaw, z.infer<Params>>,
  QueryParse = OnSchema<Query, ZodRecordRaw, RecordRaw, z.infer<Query>>,
  BodyParse = OnSchema<Body, ZodAny, any, z.infer<Body>>,
>(
  path: string,
  petal: Petal<
    CurrSeed,
    ParamsParse,
    QueryParse,
    BodyParse,
    Method extends "GET"
      ? Omit<PetalMeta<CurrSeed, ParamsParse, QueryParse, BodyParse>, "json">
      : PetalMeta<CurrSeed, ParamsParse, QueryParse, BodyParse>
  >,
  z?: {
    params?: Params
    query?: Query
    body?: Body
  },
) => Branch<InitSeed, CurrSeed>

/**
 * Creates new branch that appends to the blooming sakura later.
 *
 * @example
 * ```ts
 * // Not recommended, use sakura function instead
 * const raw = Branch.create<{ req: Request }>()
 * // Recommended
 * const { seed, branch } = sakura((req) => ({ req }))
 * const main = branch().get("/", () => fall(418))
 *
 * bloom({
 *   seed,
 *   branch: main
 *   // ...
 * })
 * ```
 */
export class Branch<InitSeed, CurrSeed> {
  handlers: HandlersTree<InitSeed, CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>

  constructor(
    handlers: HandlersTree<InitSeed, CurrSeed>,
    mutation: Mutation<InitSeed, CurrSeed>,
  ) {
    this.handlers = handlers
    this.mutation = mutation
  }

  public static create<Context>(): Branch<Context, Context> {
    return new Branch<Context, Context>({
      next: {},
    }, (seed) => seed)
  }

  public with<MutatedSeed>(
    mutation: Mutation<CurrSeed, MutatedSeed>,
  ): Branch<InitSeed, MutatedSeed> {
    return new Branch<InitSeed, MutatedSeed>(
      this.handlers as unknown as HandlersTree<InitSeed, MutatedSeed>,
      async (seed) => {
        const currSeed = await this.mutation(seed)
        return mutation(currSeed)
      },
    )
  }

  // TODO: implement merging branches + naming

  public get: BranchMethod<InitSeed, CurrSeed, "GET"> = this.method("GET")
  public post: BranchMethod<InitSeed, CurrSeed, "POST"> = this.method("POST")
  public put: BranchMethod<InitSeed, CurrSeed, "PUT"> = this.method("PUT")
  public delete: BranchMethod<InitSeed, CurrSeed, "DELETE"> = this.method(
    "DELETE",
  )
  public patch: BranchMethod<InitSeed, CurrSeed, "PATCH"> = this.method("PATCH")

  private method(method: Method): BranchMethod<InitSeed, CurrSeed, Method> {
    return (path, petal, z?) => this.append(method, path, petal, z)
  }

  private append<
    Params,
    Query,
    Body,
    Schemas,
  >(
    method: Method,
    path: string,
    petal: Petal<
      CurrSeed,
      Params,
      Query,
      Body
    >,
    z?: Schemas,
  ): Branch<InitSeed, CurrSeed> {
    const handler = { petal, mutation: this.mutation, z }

    const parts = path.split("/").filter(Boolean)
    let node = this.handlers
    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part
      if (!node.next[key]) node.next[key] = { next: {} }

      node = node.next[key]
      if (isParam) node.param = part.slice(1)
    }

    if (!node.handler) {
      node.handler = {}
    }

    // @ts-ignore --
    node.handler[method] = handler

    return new Branch<InitSeed, CurrSeed>(
      this.handlers,
      this.mutation,
    )
  }

  public match(method: Method, path: string): {
    handler: Handler<InitSeed, CurrSeed>
    params: Record<string, string>
  } | null {
    let node = this.handlers
    const parts = path.split("/").filter(Boolean)
    const params: Record<string, string> = {}

    for (const part of parts) {
      if (node.next[part]) node = node.next[part]
      else if (node.next[":"]) {
        node = node.next[":"]
        params[node.param!] = part
      } else return null
    }

    return node.handler && node.handler[method]
      ? {
        handler: node.handler[method],
        params,
      }
      : null
  }
}
