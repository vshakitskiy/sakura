export class SakuraError extends Error {
  // deno-lint-ignore no-explicit-any
  public readonly body: any
  public readonly status: number
  public readonly headers?: HeadersInit
  constructor(
    status: number,
    // deno-lint-ignore no-explicit-any
    json?: any,
    headers?: HeadersInit,
  ) {
    super("Sakura response raised without the catch")
    this.status = status
    this.body = json
    this.headers = headers
  }
}
