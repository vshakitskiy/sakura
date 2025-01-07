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
export class Branch<SeedFrom, SeedTo, Petals extends PetalAny> {
  petals: Set<Petals>
  mutation: SeedMutation<SeedFrom, SeedTo>

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

  public with = <SeedNext>(
    mutation: SeedMutation<SeedTo, SeedNext>,
  ): Branch<SeedFrom, SeedNext, Petals> =>
    new Branch<SeedFrom, SeedNext, Petals>({
      petals: this.petals,
      mutation: async (seed) => mutation(await this.mutation(seed)),
    })

  public method =
    <Method extends M>(method: Method) =>
    <Body extends Schema = never>(
      path: string,
      handler: Handler<SeedTo, Method, Body>,
      schemas?: {
        body?: Body
      },
    ) => this.append(method, path, handler, schemas)

  public append = <Method extends M, Body extends Schema = never>(
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
      petals: new Set([...this.petals, petal]),
      mutation: this.mutation,
    })
  }

  public get = this.method("GET")
  public post = this.method("POST")

  public merge = <Prefix extends `/${string}`, DiffR extends PetalAny>(
    prefix: Prefix,
    branch: Branch<SeedFrom, unknown, DiffR>,
  ) => {
    const toAppend = [...branch.petals].map((petal) => ({
      ...petal,
      path: `${prefix}${petal.path}`,
    }))

    return new Branch({
      petals: new Set([...this.petals, ...toAppend]),
      mutation: this.mutation,
    })
  }

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
    const params: Record<string, string> = {}
    const pathSegments = path.split("/").filter(Boolean)

    for (const [routePath, handlers] of routes) {
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
}
