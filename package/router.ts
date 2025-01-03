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
  ZodObject,
  ZodRawShape as RawShape,
  ZodTypeAny as ZodAny,
} from "zod"
import type { OnSchema, PartialRecord, RecordRaw } from "./utils.ts"
import { deepClone } from "./utils.ts"

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
  Meta = PetalMeta<
    any,
    SafeParse<RecordRaw, RecordRaw> | RecordRaw,
    SafeParse<RecordRaw, RecordRaw> | RecordRaw,
    SafeParse<any, any> | any
  >,
  Method = string,
> = (
  meta: Method extends "GET" ? Omit<Meta, "json"> : Meta,
) => Promise<Response> | Response

type Schemas = {
  params: ZodRecordRaw
  query: ZodRecordRaw
  body: ZodAny
}

type DefaultSchema = {
  params: undefined
  query: undefined
  body: undefined
}

/**
 * Contains the last mutation and response function
 */
export type Handler<InitSeed, CurrSeed> = {
  petal: Petal<
    PetalMeta<
      any,
      SafeParse<RecordRaw, RecordRaw> | RecordRaw,
      SafeParse<RecordRaw, RecordRaw> | RecordRaw,
      SafeParse<any, any> | any
    >
  >
  mutation: Mutation<InitSeed, CurrSeed>
  schemas?: Schemas
}

/**
 * Represents handlers as a tree.
 */
export type HandlersTree<InitSeed, CurrSeed> = {
  next: Record<string, HandlersTree<InitSeed, CurrSeed>> | null
  handler?: PartialRecord<Method, Handler<InitSeed, CurrSeed>>
  param?: PartialRecord<Method, string>
}

// @TODO: incorrect 'schemas' arg type
type BranchMethod<InitSeed, CurrSeed, Method> = <
  Z extends Partial<Schemas> = Partial<DefaultSchema>,
>(
  path: string,
  petal: Petal<
    PetalMeta<
      CurrSeed,
      OnSchema<Z["params"], ZodRecordRaw, RecordRaw>,
      OnSchema<Z["query"], ZodRecordRaw, RecordRaw>,
      OnSchema<Z["body"], ZodAny, any>
    >,
    Method
  >,
  schemas?: Z & Method extends "GET" ? Omit<Z, "body"> : Z,
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
  private handlers: HandlersTree<InitSeed, CurrSeed>
  private mutation: Mutation<InitSeed, CurrSeed>

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

  public get raw() {
    return this.handlers
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

  public join<CurrAnySeed>(
    path: string,
    branch: Branch<InitSeed, CurrAnySeed>,
  ) {
    const clone = deepClone(this.handlers)
    let curr = clone
    const node = branch.raw

    const parts = path.split("/").filter(Boolean)
    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part
      if (!curr.next) curr.next = {}
      if (!curr.next[key]) curr.next[key] = { next: null }
      curr = curr.next[key]

      // if (isParam) {
      //   if (!curr.param) curr.param = {}
      //   curr.param[method] = part.slice(1)
      // }
    }
    console.dir(clone, {
      depth: null,
    })
    curr = node as unknown as HandlersTree<InitSeed, CurrSeed>
    return new Branch<InitSeed, CurrSeed>(curr, this.mutation)
  }

  // @TODO: merge with dynamic path
  public merge<CurrAnySeed>(
    path: string,
    branch: Branch<InitSeed, CurrAnySeed>,
  ) {
    const copy = Object.assign({}, this.handlers)
    let currNode = copy
    const node = branch.raw

    const parts = path.split("/").filter(Boolean)
    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part
      if (!currNode.next) currNode.next = {}
      if (!currNode.next[key]) currNode.next[key] = { next: null }
      currNode = currNode.next[key]

      // if (isParam) {
      //   if (!currNode.param) currNode.param = {}
      //   currNode.param[method] = part.slice(1)
      // }
    }

    copyNode(
      node as unknown as HandlersTree<InitSeed, CurrSeed>,
      currNode,
    )

    if (!currNode.next) currNode.next = {}
    this._merge(
      node.next as Record<string, HandlersTree<InitSeed, CurrSeed>> | null,
      currNode.next,
    )

    return new Branch<InitSeed, CurrSeed>(
      copy,
      this.mutation,
    )
  }

  private _merge(
    from: Record<string, HandlersTree<InitSeed, CurrSeed>> | null,
    to: Record<string, HandlersTree<InitSeed, CurrSeed>> | null,
  ) {
    if (!from || !to) return

    for (const [path, node] of Object.entries(from)) {
      if (!to[path]) to[path] = { next: null }
      const next = to[path]

      // console.log("%cBefore:", "color: orange", path, next)
      copyNode(node, next)
      // console.log("%cAfter:", "color: orange", path, next)

      if (node.next) {
        if (!next.next) next.next = {}
        this._merge(
          node.next,
          next.next,
        )
      }
    }
  }

  public get: BranchMethod<InitSeed, CurrSeed, "GET"> = this.method("GET")
  public post: BranchMethod<InitSeed, CurrSeed, "POST"> = this.method("POST")
  public put: BranchMethod<InitSeed, CurrSeed, "PUT"> = this.method("PUT")
  public delete: BranchMethod<InitSeed, CurrSeed, "DELETE"> = this.method(
    "DELETE",
  )
  public patch: BranchMethod<InitSeed, CurrSeed, "PATCH"> = this.method("PATCH")

  private method(method: Method): BranchMethod<InitSeed, CurrSeed, Method> {
    return (path, petal, schemas?) => this.append(method, path, petal, schemas)
  }

  private append<Z extends Partial<Schemas>>(
    method: Method,
    path: string,
    petal: Petal<
      PetalMeta<
        CurrSeed,
        OnSchema<Z["params"], ZodRecordRaw, RecordRaw>,
        OnSchema<Z["query"], ZodRecordRaw, RecordRaw>,
        OnSchema<Z["body"], ZodAny, any>
      >,
      Method
    >,
    schemas?: Z & Method extends "GET" ? Omit<Z, "body"> : Z,
  ): Branch<InitSeed, CurrSeed> {
    const handler = { petal, mutation: this.mutation, schemas }

    const parts = path.split("/").filter(Boolean)
    let node = this.handlers
    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part
      if (!node.next) node.next = {}
      if (!node.next[key]) node.next[key] = { next: null }
      node = node.next[key]

      if (isParam) {
        if (!node.param) node.param = {}
        node.param[method] = part.slice(1)
      }
    }

    if (!node.handler) {
      node.handler = {}
    }

    // @ts-ignore joining custom types with default types
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
      if (!node.next) return null
      else if (node.next[part]) node = node.next[part]
      else if (node.next[":"]) {
        node = node.next[":"]
        params[node.param![method]!] = part
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

const copyNode = <InitSeed, CurrSeed>(
  from: HandlersTree<InitSeed, CurrSeed>,
  to: HandlersTree<InitSeed, CurrSeed>,
) => {
  if (from.handler) {
    if (!to.handler) to.handler = {}

    for (const [method, handler] of Object.entries(from.handler)) {
      to.handler[method as Method] = handler
    }
  }

  if (from.param) {
    if (!to.param) to.param = {}

    for (const [method, param] of Object.entries(from.param)) {
      to.param[method as Method] = param
    }
  }
}
