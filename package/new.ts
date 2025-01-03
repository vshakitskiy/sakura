// @NOTE: will be deleted later, storing here ideas

// UTILL
type Return<Value> = Value | Promise<Value>
type AnyRecordDef = Record<string, any>

type M = "GET" | "POST" | "PUT" | "DELETE"
// ROUTE
type HandlerArg<Seed, Param, Query, Body> = {
  seed: Seed
  param: Param
  query: Query
  body: Body
}

type Petal<
  SeedFrom,
  SeedTo,
  Method extends M,
> = {
  mutation: SeedMutation<SeedFrom, SeedTo>
  method: Method
  path: string
  handler: (
    arg: HandlerArg<SeedTo, AnyRecordDef, AnyRecordDef, any>,
  ) => Return<Response>
}

type PetalAny<SeedFrom = any, SeedTo = any> = Petal<
  SeedFrom,
  SeedTo,
  any
>

// ROUTER
export type SeedMutation<From, To> = (
  seed: From,
) => Return<To>

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

  public append = <Method extends M>(
    method: Method,
    path: string,
    handler: (
      arg: HandlerArg<SeedTo, AnyRecordDef, AnyRecordDef, any>,
    ) => Return<Response>,
  ) => {
    const petal: Petal<SeedFrom, SeedTo, M> = {
      mutation: this.mutation,
      method,
      path,
      handler,
    }

    return new Branch({
      petals: new Set([...this.petals, petal]),
      mutation: this.mutation,
    })
  }

  public finalize = <Method extends M>() => {
    const routes = new Map<string, Map<M, PetalAny>>()

    for (const route of this.petals) {
      if (!routes.has(route.path)) {
        routes.set(route.path, new Map())
      }

      routes.get(route.path)!.set(route.method, route)
    }

    return routes
  }

  public match(
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
        const route = handlers.get(method)
        if (route) {
          return {
            route,
            params,
          }
        }
      }
    }

    return null
  }

  // https://github.com/kaito-http/kaito/blob/main/packages/core/src/router/router.ts

  public with = <SeedNext>(
    mutation: SeedMutation<SeedTo, SeedNext>,
  ): Branch<SeedFrom, SeedNext, Petals> =>
    new Branch<SeedFrom, SeedNext, Petals>({
      petals: this.petals,
      mutation: async (seed) => mutation(await this.mutation(seed)),
    })
}
