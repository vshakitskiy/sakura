/**
 * Contains functions/classes related to creating and starting server.
 *
 * @example
 * ```ts
 * import { sakura, bloom } from "@vsh/sakura"
 *
 * const { seed, branch } = sakura((req) => ({ req }))
 *
 * const main = branch()
 * // ...
 *
 * bloom({
 *   seed,
 *   branch: main,
 *   port: 3000,
 *   log: true
 * })
 * @module
 * ```
 */

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
  seed: init,
  branch,
  port = 8000,
  unknown,
  error,
  logger,
  quiet,
}: {
  seed: GenSeed<InitSeed>
  branch: Branch<InitSeed, CurrSeed>
  port?: number
  unknown?: ({ req, seed }: {
    req: Request
    seed: InitSeed
  }) => Promise<Response> | Response
  error?: ({ error }: { error: unknown }) => Promise<Response> | Response
  logger?: boolean
  quiet?: boolean
}): Deno.HttpServer<Deno.NetAddr> => {
  return Deno.serve({
    port,
    onListen: () =>
      quiet || console.log(
        `%c🌸 Blooming on %chttp://localhost:${port}/`,
        "color: pink",
        "color: pink; font-weight: bold",
      ),
  }, async (req) => {
    const time = Date.now()
    const url = new URL(req.url)
    const resp = await (async () => {
      try {
        const initSeed = await init(req)
        const match = branch.match(req.method as Method, url.pathname)

        if (!match) {
          if (unknown) return await unknown({ req, seed: initSeed })
          else return fall(404, { message: "not found" })
        }
        const { params: p, handler: { mutation, petal, z } } = match
        const seed = await mutation(initSeed)

        let query: {
          // deno-lint-ignore no-explicit-any
          [x: string]: any
        } = {}
        for (const [key, val] of url.searchParams) {
          query[key] = val
        }
        let params = p

        if (z) {
          if (z.params) params = z.params.parse(params)
          if (z.query) query = z.query.parse(query)
        }

        const resp = await petal({
          req,
          seed,
          params,
          query,
        })
        return resp
      } catch (err: unknown) {
        if (err instanceof SakuraError) {
          return fall(err.status, err.body)
        } else {
          if (error) {
            try {
              return await error({ error: err })
            } catch (_) {
              return fall(500, { message: "internal server error" })
            }
          } else return fall(500, { message: "internal server error" })
        }
      }
    })()
    if (logger) {
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
