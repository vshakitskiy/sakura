import { assertEquals } from "@std/assert"
import { fall, pluck, sakura } from "../package/mod.ts"
import type { GenSeed } from "../package/server.ts"
import { SakuraClient } from "../package/client.ts"

type User = { id: number; name: string } | null

const authSeedFn: GenSeed<{
  user: User
  db: { getUser: (id: number) => Promise<User> }
}> = async (req) => {
  const db = {
    getUser: async (id: number): Promise<User> =>
      id === 1 ? { id: 1, name: "Alice" } : null,
  }
  const authHeader = req.headers.get("Authorization")
  let user: User = null
  if (authHeader === "Bearer user-1-token") {
    user = await db.getUser(1)
  }
  return { user, db }
}

const { branch } = sakura(authSeedFn)

Deno.test("Seed: Initial Seed Access", async () => {
  const app = branch().get("/me", ({ seed }) => {
    return fall(200, { user: seed.user })
  })
  const client = new SakuraClient(app, authSeedFn)

  const resAuth = await client.get("/me", {
    cookies: {},
    headers: { Authorization: "Bearer user-1-token" },
  })
  assertEquals(resAuth.res.status, 200)
  assertEquals(resAuth.body, { user: { id: 1, name: "Alice" } })

  const resNoAuth = await client.get("/me")
  assertEquals(resNoAuth.res.status, 200)
  assertEquals(resNoAuth.body, { user: null })
})

Deno.test("Seed: Seed Mutation with .with", async () => {
  const app = branch()
    .with((seed) => {
      if (!seed.user) {
        throw pluck(401, { error: "Unauthorized" })
      }
      return { ...seed, isAdmin: seed.user.id === 1 }
    })
    .get("/admin/data", ({ seed }) => {
      if (!seed.isAdmin) {
        return fall(403, { error: "Forbidden" })
      }
      return fall(200, { data: "sensitive admin data", user: seed.user })
    })

  const client = new SakuraClient(app, authSeedFn)

  const resAdmin = await client.get("/admin/data", {
    headers: { Authorization: "Bearer user-1-token" },
  })
  assertEquals(resAdmin.res.status, 200)
  assertEquals(resAdmin.body, {
    data: "sensitive admin data",
    user: { id: 1, name: "Alice" },
  })

  const resUnauthorized = await client.get("/admin/data")
  assertEquals(resUnauthorized.res.status, 401)
  assertEquals(resUnauthorized.body, { error: "Unauthorized" })
})

Deno.test("Seed: Async Seed Mutation", async () => {
  const { branch: baseBranch, seed: baseSeed } = sakura(() => ({ count: 0 }))

  const app = baseBranch()
    .with(async (seed) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { ...seed, count: seed.count + 1 }
    })
    .with((seed) => {
      return { ...seed, count: seed.count * 2 }
    })
    .get("/count", ({ seed }) => fall(200, { finalCount: seed.count }))

  const client = new SakuraClient(app, baseSeed)
  const { body } = await client.get("/count")

  assertEquals(body, { finalCount: 2 })
})
