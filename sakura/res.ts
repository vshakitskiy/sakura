export class SakuraResponse {
  public readonly body: BodyInit
  public readonly status: number
  public readonly headers?: HeadersInit
  constructor(
    status: number,
    // deno-lint-ignore no-explicit-any
    json?: Record<string, any> | number | null,
    headers?: HeadersInit,
  ) {
    this.status = status
    this.body = JSON.stringify(json ?? undefined)
    this.headers = headers
  }

  return(): Response {
    return new Response(this.body, {
      status: this.status,
      headers: {
        "Content-type": "application/json",
        ...this.headers,
      },
    })
  }
}

// TODO: function name
export const res = (
  status: number,
  // deno-lint-ignore no-explicit-any
  json?: Record<string, any> | number | null,
  headers?: HeadersInit,
): SakuraResponse => {
  return new SakuraResponse(status, json, headers)
}
