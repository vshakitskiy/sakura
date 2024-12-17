import { bloom, res, sakura } from "@vsh/sakura"
import { assertEquals } from "@std/assert"

Deno.test("basic test", async () => {
  // simple branch
  const { branch, seed } = sakura((req) => ({
    req,
    mutations: 0,
    extra: 0,
    in: {
      si: {
        de: true,
      },
    },
  }))

  /*
  on "/" do seed.mutation + 1 (1st mutation) | 1
  on "/extra" do seed.mutation + 1 & seed.extra + 1 (2nd mutation) | 1 & 2
  */
  const mainBranch = branch()
    .with((seed) => ({
      ...seed,
      mutations: seed.mutations + 1,
    }))
    .get("/", (_req, seed) => res(200, seed))
    .with((seed) => ({
      ...seed,
      mutations: seed.mutations + 1,
      extra: seed.extra + 1,
    }))
    .get("/extra", (_req, seed) => res(200, seed))

  // start server
  const server = bloom({
    seed,
    branch: mainBranch,
    unknownPetal: (_req, _seed) => {
      return res(404, { message: "Unknown Handler" })
    },
  })

  const resp = await fetch("http://localhost:8000/abc")
  assertEquals((await resp.json()).message, "Unknown Handler")
  server.shutdown()
})
