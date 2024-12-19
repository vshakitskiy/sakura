import type { SakuraResponse } from "./res.ts"

// deno-lint-ignore no-explicit-any
type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

// TODO: ALL?
export type Method = "GET" | "POST" | "DELETE" | "PUT"

export type Mutation<From, To> = (
  seed: From,
) => To | Promise<To>

// TODO: replace params as "request meta" object
export type Handler<CurrSeed> = (
  req: Request,
  seed: CurrSeed,
) => Promise<SakuraResponse> | SakuraResponse

export type Petal<InitSeed, CurrSeed> = {
  handler: Handler<CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>
}

export type PetalsTree<InitSeed, CurrSeed> = {
  nxt: Record<string, PetalsTree<InitSeed, CurrSeed>>
  ptl?: PartialRecord<Method, Petal<InitSeed, CurrSeed>>
  prm?: string
}

export class Branch<InitSeed, CurrSeed> {
  petals: PetalsTree<InitSeed, CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>

  constructor(
    petals: PetalsTree<InitSeed, CurrSeed>,
    mutation: Mutation<InitSeed, CurrSeed>,
  ) {
    this.petals = petals
    this.mutation = mutation
  }

  public static create<Context>(): Branch<Context, Context> {
    return new Branch<Context, Context>({
      nxt: {},
    }, (seed) => seed)
  }

  public with<MutatedSeed>(
    mutation: Mutation<CurrSeed, MutatedSeed>,
  ): Branch<InitSeed, MutatedSeed> {
    return new Branch<InitSeed, MutatedSeed>(
      this.petals as unknown as PetalsTree<InitSeed, MutatedSeed>,
      async (seed) => {
        const currSeed = await this.mutation(seed)
        return mutation(currSeed)
      },
    )
  }

  // TODO: implement merging branches + naming

  public get(
    path: string,
    handler: Handler<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    return this.method("GET", path, handler)
  }

  public post(
    path: string,
    handler: Handler<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    return this.method("POST", path, handler)
  }

  // TODO: PUT, DELETE methods (ALL?)
  private method(
    method: Method,
    path: string,
    handler: Handler<CurrSeed>,
  ): Branch<InitSeed, CurrSeed> {
    const petal = { handler, mutation: this.mutation }

    const parts = path.split("/").filter(Boolean)
    let node = this.petals
    for (const part of parts) {
      const isParam = part.startsWith(":")
      const key = isParam ? ":" : part
      if (!node.nxt[key]) node.nxt[key] = { nxt: {} }

      node = node.nxt[key]
      if (isParam) node.prm = part.slice(1)
    }

    if (!node.ptl) {
      node.ptl = {}
    }
    node.ptl[method] = petal

    return new Branch<InitSeed, CurrSeed>(
      this.petals,
      this.mutation,
    )
  }

  public match(method: Method, path: string): {
    petal: Petal<InitSeed, CurrSeed>
    params: Record<string, string>
  } | null {
    let node = this.petals
    const parts = path.split("/").filter(Boolean)
    const params: Record<string, string> = {}

    for (const part of parts) {
      if (node.nxt[part]) node = node.nxt[part]
      else if (node.nxt[":"]) {
        node = node.nxt[":"]
        params[node.prm!] = part
      } else return null
    }

    return node.ptl && node.ptl[method]
      ? {
        petal: node.ptl[method],
        params,
      }
      : null
  }
}
