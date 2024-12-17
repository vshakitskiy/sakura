export class SakuraError extends Error {
  public readonly body: BodyInit
  public readonly status: number
  public readonly headers?: HeadersInit
  constructor(
    status: number,
    // deno-lint-ignore no-explicit-any
    json?: Record<string, any> | null,
    headers?: HeadersInit,
  ) {
    super("Sakura response raised without the catch")
    this.status = status
    this.body = JSON.stringify(json ?? undefined)
    this.headers = headers
  }
}
