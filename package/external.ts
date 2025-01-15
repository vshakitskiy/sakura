import type { Return } from "./utils.ts"

export type ErrorHandler<SeedFrom> = (
  { error, seed }: { error: unknown; seed: SeedFrom },
) => Return<Response>

export type BeforeHandler<SeedFrom> = (
  { req, seed }: { req: Request; seed: SeedFrom },
) => Return<Response>
