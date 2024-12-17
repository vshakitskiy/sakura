import { SakuraResponse } from "./res.ts"

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
  method: Method
  path: string
  handler: Handler<CurrSeed>
  mutation: Mutation<InitSeed, CurrSeed>
}

export const createPetal = <InitSeed, CurrSeed>(
  method: Method,
  path: string,
  handler: Handler<CurrSeed>,
  mutation: Mutation<InitSeed, CurrSeed>,
): Petal<InitSeed, CurrSeed> => ({
  method,
  path,
  handler,
  mutation,
})

export class Branch<InitSeed, CurrSeed> {
  // TODO: implement petals as Tree
  petals: Petal<InitSeed, CurrSeed>[]
  mutation: Mutation<InitSeed, CurrSeed>

  constructor(
    petals: Petal<InitSeed, CurrSeed>[],
    mutation: Mutation<InitSeed, CurrSeed>,
  ) {
    this.petals = petals
    this.mutation = mutation
  }

  public static create<Context>() {
    return new Branch<Context, Context>([], (seed) => seed)
  }

  with<MutatedSeed>(
    mutation: Mutation<CurrSeed, MutatedSeed>,
  ): Branch<InitSeed, MutatedSeed> {
    return new Branch<InitSeed, MutatedSeed>(
      this.petals as unknown as Petal<InitSeed, MutatedSeed>[],
      async (seed) => {
        const currSeed = await this.mutation(seed)
        return mutation(currSeed)
      },
    )
  }

  // TODO: implement merging branches + naming

  get(path: string, handler: Handler<CurrSeed>) {
    const petal = createPetal<InitSeed, CurrSeed>(
      "GET",
      path,
      handler,
      this.mutation,
    )

    return new Branch<InitSeed, CurrSeed>(
      [...this.petals, petal],
      this.mutation,
    )
  }

  // TODO: POST, PUT, DELETE methods (ALL?)
}
