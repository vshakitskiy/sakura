import { Branch } from "./router.ts"
import type { Method } from "./router.ts"
import { SakuraError } from "./error.ts"
import { res, type SakuraResponse } from "./res.ts"

type GenSeed<Seed> = (req: Request) => Seed | Promise<Seed>

/**
 * Initialize branch function with the seed provided.
 * @example
 * ```ts
 * const { branch, seed } = sakura(req => ({
 *   req,
 *   getSession: async () => {
 *     // ...
 *   },
 *   ms: Date.now()
 * }))
 * ```
 */
export const sakura = <Seed>(seed: GenSeed<Seed>): {
  seed: GenSeed<Seed>
  branch: () => Branch<Seed, Seed>
} => ({
  seed,
  branch: () => Branch.create<Seed>(),
})

// TODO: fall(req, res, seed | meta + res) method (After request handler)
/**
 * Start Deno server with the options provided.
 * @example
 * ```ts
 * const mainBranch = branch().get("/", (req, seed) => {
 *   // ...
 * })
 *
 * bloom({
 *   seed,
 *   branch: mainBranch,
 *   // ...
 * })
 * ```
 */
export const bloom = <InitSeed, CurrSeed>({
  seed,
  branch,
  port = 8000,
  unknown,
  error,
  log,
}: {
  seed: GenSeed<InitSeed>
  branch: Branch<InitSeed, CurrSeed>
  port?: number
  unknown?: (
    req: Request,
    seed: InitSeed,
  ) => Promise<SakuraResponse> | SakuraResponse
  error?: (error: unknown) => Promise<SakuraResponse> | SakuraResponse
  log?: boolean
}): Deno.HttpServer<Deno.NetAddr> => {
  return Deno.serve({
    port,
    onListen: () =>
      console.log(
        `%c🌸 Blooming on %chttp://localhost:${port}/`,
        "color: pink",
        "color: pink; font-weight: bold",
      ),
  }, async (req) => {
    const time = Date.now()
    const url = new URL(req.url)
    const resp = await (async () => {
      try {
        const initSeed = await seed(req)
        const match = branch.match(req.method as Method, url.pathname)

        if (!match) {
          if (unknown) return (await unknown(req, initSeed)).return()
          else return res(404).return()
        }

        const currSeed = await match.petal.mutation(initSeed)
        const resp = await match.petal.handler(req, currSeed)
        return resp.return()
      } catch (err: unknown) {
        if (err instanceof SakuraError) {
          return res(err.status, err.body).return()
        } else {
          if (error) {
            try {
              return (await error(err)).return()
            } catch (_) {
              return res(500).return()
            }
          } else return res(500).return()
        }
      }
    })()
    if (log) {
      const ms = Date.now() - time
      console.log(
        `%c${req.method} %c${url.pathname} %c${resp.status} ${ms}ms`,
        "color: blue",
        "color: #fff",
        "color: green",
      )
    }
    return resp
  })
}
