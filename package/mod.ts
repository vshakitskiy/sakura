/**
 * Contains functions/classes related to sending response.
 *
 * @example
 * ```ts
 * import { pluck, fall } from "@vsh/sakura"
 *
 * const branch =
 *   .with((seed) => {
 *     const session = seed.getSession()
 *     if (!session) {
 *       pluck(401, { message: "Unauthorized" })
 *     }
 *
 *     return {
 *       ...seed,
 *       session
 *     }
 *   })
 *   .get("/session", () => fall(200, session))
 *
 * @module
 * ```
 */
export * from "./res.ts"

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
export * from "./router.ts"

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
export * from "./server.ts"
