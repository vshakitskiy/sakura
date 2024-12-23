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

type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

type ZodRecordRaw = ZodObject<RawShape>

type RecordRaw = {
  [x: string]: any
}

export type ExtractSeed<T> = T extends Branch<any, infer CurrSeed> ? CurrSeed
  : never

// TODO: ALL?
/**
 * Request's method.
 */
export type Method = "GET" | "POST" | "DELETE" | "PUT"

/**
 * Mutates seed and returns it.
 */
export type Mutation<From, To> = (
  seed: From,
) => To | Promise<To>

// TODO: change description
/**
 * Function with the last mutation of the seed. Sends Response to the client.
 */
export type Petal<
  CurrSeed,
  Params = SafeParse<RecordRaw, RecordRaw> | RecordRaw,
  Query = SafeParse<RecordRaw, RecordRaw> | RecordRaw,
  Body = SafeParse<any, any> | RecordRaw,
> = (
  { req, seed, params, query, json }: {
    req: Request
    seed: CurrSeed
    params: Params
    query: Query
    json: Body
  },
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

type BranchMethod<InitSeed, CurrSeed> = <
  Params,
  Query,
  Body,
>(
  path: string,
  petal: Petal<
    CurrSeed,
    Params extends ZodRecordRaw ? SafeParse<RecordRaw, z.infer<Params>>
      : RecordRaw,
    Query extends ZodRecordRaw ? SafeParse<RecordRaw, z.infer<Query>>
      : RecordRaw,
    Body extends ZodAny ? SafeParse<any, z.infer<Body>>
      : any
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

  // TODO: PUT, DELETE methods (ALL?)
  public get: BranchMethod<InitSeed, CurrSeed> = this.method("GET")
  public post: BranchMethod<InitSeed, CurrSeed> = this.method("POST")

  private method(method: Method): BranchMethod<InitSeed, CurrSeed> {
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
