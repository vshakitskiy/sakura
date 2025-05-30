export interface ResponseState {
  active: boolean
  body: BodyInit | null
  status: number
  headers: Headers
  // response?: Response
}
