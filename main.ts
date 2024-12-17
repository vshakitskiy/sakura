// HOW: structure repo?
// HOW: @jsr packages?
import { res } from "./sakura/res.ts"
import { bloom, sakura } from "./sakura/server.ts"

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
bloom({
  seed,
  branch: mainBranch,
  unknownPetal: (_req, _seed) => {
    return res(404, { message: "Uknown Handler" })
  },
})
