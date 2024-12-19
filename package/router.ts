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

// deno-lint-ignore no-explicit-any
type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

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

// TODO: replace params as "request meta" object
/**
 * Function with the last mutation of the seed. Sends Response to the client.
 */
export type Petal<CurrSeed> = (
  req: Request,
  seed: CurrSeed,
) => Promise<Response> | Response

/**
 * Contains the last mutation and response function
 */
export type Handler<InitSeed, CurrSeed> = {
  petal: Petal<CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>
}

/**
 * Represents handlers as a tree.
 */
export type HandlersTree<InitSeed, CurrSeed> = {
  next: Record<string, HandlersTree<InitSeed, CurrSeed>>
  handler?: PartialRecord<Method, Handler<InitSeed, CurrSeed>>
  param?: string
}

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

  public get(
    path: string,
    petal: Petal<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    return this.method("GET", path, petal)
  }

  public post(
    path: string,
    petal: Petal<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    return this.method("POST", path, petal)
  }

  // TODO: PUT, DELETE methods (ALL?)
  private method(
    method: Method,
    path: string,
    petal: Petal<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    const handler = { petal, mutation: this.mutation }

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
