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
import type { Handler, Petal, PetalAny } from "./route.ts"
import type { Method as M, Schema, SeedMutation } from "./utils.ts"
import { toSchema } from "./utils.ts"

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
  public static init = <SeedInit>(): Branch<SeedInit, SeedInit, never> =>
    new Branch<SeedInit, SeedInit, never>({
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

  private method =
    <Method extends M>(method: Method) =>
    <Body extends Schema = never>(
      path: string,
      handler: Handler<SeedTo, Method, Body>,
      schemas?: {
        body?: Body
      },
    ) => this._append(method, path, handler, schemas)

  /**
   * Corresponds to the GET http method.
   */
  public get = this.method("GET")

  /**
   * Corresponds to the POST http method.
   */
  public post = this.method("POST")

  /**
   * Corresponds to the PUT http method.
   */
  public put = this.method("PUT")

  /**
   * Corresponds to the PATCH http method.
   */
  public patch = this.method("PATCH")

  /**
   * Corresponds to the DELETE http method.
   */
  public delete = this.method("DELETE")

  /**
   * Merges one branch into another by prefix. Mutations of each other are not affected.
   */
  public merge = <Prefix extends `/${string}`, DiffR extends PetalAny>(
    prefix: Prefix,
    branch: Branch<SeedFrom, unknown, DiffR>,
  ) => {
    const toAppend = [...branch.petals].map((petal) => ({
      ...petal,
      path: `${prefix}${petal.path}`,
    }))

    return new Branch({
      petals: new Set([...toAppend, ...this.petals]),
      mutation: this.mutation,
    })
  }

  /**
   * Returns match function to search petal by method and path.
   */
  public finalize = () => {
    const routes = new Map<string, Map<M, PetalAny>>()

    for (const route of this.petals) {
      if (!routes.has(route.path)) {
        routes.set(route.path, new Map())
      }

      routes.get(route.path)!.set(route.method, route)
    }

    return (method: M, path: string) => this._match(routes, method, path)
  }

  private _match(
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
    schemas?: {
      body?: Body
    },
  ) => {
    const petal = {
      mutation: this.mutation,
      method,
      path,
      handler,
      body: schemas?.body?.parse ? toSchema(schemas.body.parse) : undefined,
    } as Petal<SeedFrom, SeedTo, M, Body>

    return new Branch({
      petals: new Set([petal, ...this.petals]),
      mutation: this.mutation,
    })
  }
}
