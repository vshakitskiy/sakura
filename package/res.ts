/**
 * Contains uiilities for sending responses.
 *
 * @example
 * ```ts
 * import { pluck, fall } from "@vsh/sakura"
 *
 * const main = branch()
 *   .with(({ getSession }) => {
 *     const session = getSession()
 *     if (!session) {
 *       throw pluck(401, { message: "Unauthorized" })
 *     }
 *
 *     return {
 *       ...seed,
 *       session
 *     }
 *   })
 *   .get("/session", ({ seed }) => fall(200, seed.session))
 * ```
 * @module
 */

/**
 * Represents Response as an Error.
 */
export class SakuraError extends Error {
  public readonly body: any
  public readonly status: number
  public readonly headers?: HeadersInit
  constructor(
    status: number,
    json?: any,
    headers?: HeadersInit,
  ) {
    super("Sakura Response")
    this.status = status
    this.body = json
    this.headers = headers
  }
}

/**
 * Throws Response as an Error. Use inside the seed mutation when you want to send Response early.
 *
 * @example
 * ```ts
 * import { pluck } from "@vsh/sakura"
 *
 * // Later on the branch...
 * .with((seed) => {
 *   if (!seed.getSession()) {
 *     throw pluck(401, { message: "Unauthorized" })
 *   }
 *
 *   return seed
 * })
 * ```
 */
export const pluck = (
  status: number,
  json?: any,
  headers?: HeadersInit,
): SakuraError => {
  return new SakuraError(status, json, headers)
}

/**
 * Creates Response based on the arguments provided.
 *
 * @example
 * ```ts
 * import { fall } from "@vsh/sakura"
 *
 * // Later on the branch...
 * .get("/ping", () => fall(200, { message: "pong" }))
 * ```
 */
export const fall = (
  status: number,
  json?: any,
  headers?: HeadersInit,
): Response => {
  const body = json ? JSON.stringify(json) : null

  const h = new Headers(headers)
  h.set("content-type", "application/json")

  return new Response(body, {
    status,
    headers: h,
  })
}
