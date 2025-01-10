import { Branch, fall } from "@vsh/sakura"
import type { PetalAny } from "@vsh/sakura"

const b = Branch.init

const pow = (branch: Branch<unknown, unknown, PetalAny>, num: number) => {
  let curr = branch
  let res = branch

  for (let i = 0; i < num; i++) {
    for (let j = 0; j < 10; j++) {
      res = res.merge(`/${j}`, curr)
    }
    curr = res
  }

  return res
}

let nums = b()
  .get("/1", () => fall(200))
  .get("/2", () => fall(200))
  .get("/3", () => fall(200))
  .get("/4", () => fall(200))
  .get("/5", () => fall(200))
  .get("/6", () => fall(200))
  .get("/7", () => fall(200))
  .get("/8", () => fall(200))
  .get("/9", () => fall(200))
  .get("/0", () => fall(200))

Deno.bench({
  name: "old match()",
  group: "1 level nesting",
  fn: (b) => {
    const match = pow(nums, 1)._finalize()
    b.start()
    match("GET", "/0/0")
    b.end()
  },
})

Deno.bench({
  name: "new match()",
  group: "1 level nesting",
  fn: (b) => {
    const branch = pow(nums, 1)
    const match = branch.finalize()
    b.start()
    match("GET", "/0/0")
    b.end()
  },
})

Deno.bench({
  name: "old match()",
  group: "2 level nesting",
  fn: (b) => {
    const match = pow(nums, 2)._finalize()
    b.start()
    match("GET", "/0/0/0")
    b.end()
  },
})

Deno.bench({
  name: "new match()",
  group: "2 level nesting",
  fn: (b) => {
    const branch = pow(nums, 2)
    const match = branch.finalize()
    b.start()
    match("GET", "/0/0/0")
    b.end()
  },
})

Deno.bench({
  name: "old match()",
  group: "3 level nesting",
  fn: (b) => {
    const match = pow(nums, 3)._finalize()
    b.start()
    match("GET", "/0/0/0/0")
    b.end()
  },
})

Deno.bench({
  name: "new match()",
  group: "3 level nesting",
  fn: (b) => {
    const branch = pow(nums, 3)
    const match = branch.finalize()
    b.start()
    match("GET", "/0/0/0/0")
    b.end()
  },
})
