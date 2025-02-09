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
 * ```
 * @module
 */
import type { Handler, Petal, PetalAny } from "./route.ts"
import type {
  Method as M,
  PartialRecord,
  Schema,
  SeedMutation,
  StringRecord,
} from "./utils.ts"
import { toSchema } from "./utils.ts"

// @TODO: docs
export type RoutesTree<SeedFrom, SeedTo, Petals extends PetalAny> = {
  next: Record<string, RoutesTree<SeedFrom, SeedTo, Petals>>
  petals: PartialRecord<M, Petal<SeedFrom, SeedTo, M, Schema<any, any>>>
  params: PartialRecord<M, string>
}

const initNode = () => {
  return {
    next: {},
    petals: {},
    params: {},
  }
}

// @TODO: docs
export type Schemas<Body extends Schema> = {
  body?: Body
}

// @TODO: docs
export type Match<SeedFrom, SeedTo> = (method: M, path: string) => {
  petal: Petal<SeedFrom, SeedTo, M, Schema<any, any>>
  params: StringRecord
} | null

type OnMethod<Method extends M, SeedFrom, SeedTo, Petals extends PetalAny> = <
  Body extends Schema = never,
>(
  path: string,
  handler: Handler<SeedTo, Method, Body>,
  schemas?: Method extends "GET" ? Omit<Schemas<Body>, "body">
    : Schemas<Body>,
) => Branch<
  SeedFrom,
  SeedTo,
  Petals | Petal<SeedFrom, SeedTo, M, Body>
>

/**
 * Creates new branch that appends to the blooming sakura later.
 *
 * @example
 * ```ts
 * const raw = Branch.init<{ req: Request }>
 *
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
export class Branch<SeedFrom, SeedTo, Petals extends PetalAny> {
  // @TODO: fill examples in jsdoc

  /**
   * Set of petals.
   */
  public petals: Set<Petals>

  /**
   * Mutates initial seed into the latest form of seed.
   */
  public mutation: SeedMutation<SeedFrom, SeedTo>

  /**
   * Creates empty branch with basic mutation function.
   */
  public static init = <SeedInit>(): Branch<SeedInit, SeedInit, PetalAny> =>
    new Branch<SeedInit, SeedInit, PetalAny>({
      petals: new Set(),
      mutation: (seed) => seed,
    })

  constructor({
    petals,
    mutation,
  }: {
    petals: Set<Petals>
    mutation: SeedMutation<SeedFrom, SeedTo>
  }) {
    this.petals = petals
    this.mutation = mutation
  }

  /**
   * Updates mutation function that will mutate the last form of the seed.
   */
  public with = <SeedNext>(
    mutation: SeedMutation<SeedTo, SeedNext>,
  ): Branch<SeedFrom, SeedNext, Petals> =>
    new Branch<SeedFrom, SeedNext, Petals>({
      petals: this.petals,
      mutation: async (seed) => mutation(await this.mutation(seed)),
    })

  private method = <Method extends M>(
    method: Method,
  ): OnMethod<Method, SeedFrom, SeedTo, Petals> =>
  (
    path,
    handler,
    schemas?,
  ) => this._append(method, path, handler, schemas)

  /**
   * Corresponds to the GET http method.
   */
  public get: OnMethod<"GET", SeedFrom, SeedTo, Petals> = this.method("GET")

  /**
   * Corresponds to the POST http method.
   */
  public post: OnMethod<"POST", SeedFrom, SeedTo, Petals> = this.method("POST")

  /**
   * Corresponds to the PUT http method.
   */
  public put: OnMethod<"PUT", SeedFrom, SeedTo, Petals> = this.method("PUT")

  /**
   * Corresponds to the PATCH http method.
   */
  public patch: OnMethod<"PATCH", SeedFrom, SeedTo, Petals> = this.method(
    "PATCH",
  )

  /**
   * Corresponds to the DELETE http method.
   */
  public delete: OnMethod<"DELETE", SeedFrom, SeedTo, Petals> = this.method(
    "DELETE",
  )

  /**
   * Merges one branch into another by prefix. Mutations of each other are not affected.
   */
  public merge = <Prefix extends `/${string}`, DiffR extends PetalAny>(
    prefix: Prefix,
    branch: Branch<SeedFrom, any, DiffR>,
  ): Branch<SeedFrom, SeedTo, Petals> => {
    const toAppend = [...branch.petals].map((petal) => ({
      ...petal,
      path: `${prefix}${petal.path}`,
    }))

    return new Branch({
      petals: new Set([...this.petals, ...toAppend]),
      mutation: this.mutation,
    }) as Branch<SeedFrom, SeedTo, Petals>
  }

  /**
   * Returns match function to search petal by method and path.
   */
  public finalize = (): Match<SeedFrom, SeedTo> => {
    const node: RoutesTree<SeedFrom, SeedTo, Petals> = {
      next: {},
      petals: {},
      params: {},
    }

    for (const petal of this.petals) {
      this._appendNode(node, petal)
    }
    return (method, path) => this._matchTree(node, method, path)
  }

  /**
   * Returns match function to search petal by method and path.
   * @deprecated use finalize() instead, since _finalize() uses slower match algorithm.
   */
  public _finalize = (): Match<SeedFrom, SeedTo> => {
    const routes = new Map<string, Map<M, PetalAny>>()

    for (const route of this.petals) {
      if (!routes.has(route.path)) {
        routes.set(route.path, new Map())
      }

      routes.get(route.path)!.set(route.method, route)
    }

    return (method: M, path: string) => this._matchMap(routes, method, path)
  }

  private _appendNode = (
    root: RoutesTree<SeedFrom, SeedTo, Petals>,
    petal: Petals,
  ) => {
    const parts = petal.path.split("/").filter(Boolean)
    let node = root

    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part

      if (!node.next[key]) node.next[key] = initNode()
      node = node.next[key]

      if (isParam) node.params[petal.method] = part.slice(1)
    }

    node.petals[petal.method] = petal
  }

  private _matchTree = (
    tree: RoutesTree<SeedFrom, SeedTo, Petals>,
    method: M,
    path: string,
  ) => {
    let node = tree
    const parts = path.split("/").filter(Boolean)
    const params: StringRecord = {}

    for (const part of parts) {
      if (node.next[part]) node = node.next[part]
      else if (node.next[":"]) {
        node = node.next[":"]
        params[node.params[method]!] = part
      } else return null
    }

    return node.petals[method]
      ? {
        petal: node.petals[method],
        params,
      }
      : null
  }

  private _matchMap(
    routes: Map<string, Map<M, PetalAny>>,
    method: M,
    path: string,
  ) {
    const pathSegments = path.split("/").filter(Boolean)
    let params: Record<string, string> = {}

    for (const [routePath, handlers] of routes) {
      params = {}
      const routeSegments = routePath.split("/").filter(Boolean)

      if (routeSegments.length !== pathSegments.length) continue

      let matches = true
      for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i]
        const pathSegment = pathSegments[i]

        if (routeSegment && pathSegment && routeSegment.startsWith(":")) {
          params[routeSegment.slice(1)] = pathSegment
        } else if (routeSegment !== pathSegment) {
          matches = false
          break
        }
      }

      if (matches) {
        const petal = handlers.get(method)
        if (petal) {
          return {
            petal,
            params,
          }
        }
      }
    }

    return null
  }

  private _append = <Method extends M, Body extends Schema = never>(
    method: Method,
    path: string,
    handler: Handler<SeedTo, Method, Body>,
    schemas?: Schemas<Body>,
  ) => {
    const petal = {
      mutation: this.mutation,
      method,
      path,
      handler,
      body: schemas?.body?.parse ? toSchema(schemas.body.parse) : undefined,
    } as Petal<SeedFrom, SeedTo, M, Body>

    return new Branch({
      petals: new Set([...this.petals, petal]),
      mutation: this.mutation,
    })
  }
}

// @TODO: docs
export type BranchAny = Branch<unknown, unknown, PetalAny>

/** Extracts last `Seed` from the branch. */
export type ExtractSeed<T> = T extends Branch<any, infer Seed, PetalAny> ? Seed
  : never
