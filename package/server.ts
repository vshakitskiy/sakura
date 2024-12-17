import { Branch } from "./router.ts"
import { SakuraError } from "./error.ts"
import { SakuraResponse } from "./res.ts"

type GenSeed<Seed> = (req: Request) => Seed | Promise<Seed>

export const sakura = <Seed>(seed: GenSeed<Seed>): {
  seed: GenSeed<Seed>
  branch: () => Branch<Seed, Seed>
} => ({
  seed,
  branch: () => Branch.create<Seed>(),
})

// TODO: fall(req, res, seed | meta + res) method (After request handler)
/*
  TODO: on error handler + naming:
  HANDLER -> SakuraError -> "error handler" -> DEFAULT INTERNAL SERVER
*/
export const bloom = <InitSeed, CurrSeed>({
  seed,
  branch,
  unknownPetal,
}: {
  seed: GenSeed<InitSeed>
  branch: Branch<InitSeed, CurrSeed>
  unknownPetal: (
    req: Request,
    seed: InitSeed,
  ) => Promise<SakuraResponse> | SakuraResponse
}) => {
  Deno.serve(async (req) => {
    const initSeed = await seed(req)
    const petal = branch.petals.find(({ path }) =>
      path === new URL(req.url).pathname
    )

    if (!petal) {
      try {
        return (await unknownPetal(req, initSeed)).return()
      } catch (error: unknown) {
        return onHandleError(error)
      }
    }

    try {
      const currSeed = await petal.mutation(initSeed)
      const res = await petal.handler(req, currSeed)
      return res.return()
    } catch (error: unknown) {
      return onHandleError(error)
    }
  })
}

const onHandleError = (error: unknown) => {
  if (error instanceof SakuraError) {
    return new Response(error.body, {
      status: error.status,
      headers: {
        "Content-Type": "application/json",
        ...error.headers,
      },
    })
  }
  console.error(error)
  return new Response(
    JSON.stringify({
      message: "Internal Server Error, try again later",
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}
