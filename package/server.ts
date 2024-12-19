import { Branch } from "./router.ts"
import type { Method } from "./router.ts"
import { SakuraError } from "./res.ts"
import { fall } from "./res.ts"

/**
 * Creates request's inital seed.
 */
export type GenSeed<Seed> = (req: Request) => Seed | Promise<Seed>

/**
 * Initialize branch function with the seed provided.
 *
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
 * Starts server with the options provided.
 *
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
  ) => Promise<Response> | Response
  error?: (error: unknown) => Promise<Response> | Response
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
          if (unknown) return await unknown(req, initSeed)
          else return fall(404)
        }

        const currSeed = await match.handler.mutation(initSeed)
        const resp = await match.handler.petal(req, currSeed)
        return resp
      } catch (err: unknown) {
        if (err instanceof SakuraError) {
          return fall(err.status, err.body)
        } else {
          if (error) {
            try {
              return await error(err)
            } catch (_) {
              return fall(500)
            }
          } else return fall(500)
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
