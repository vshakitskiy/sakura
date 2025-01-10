import { Branch, fall } from "@vsh/sakura"
import { empty, exists, is, plug, run } from "./utils.ts"

const branch = Branch.init<{ req: Request }>

Deno.test("Match with no params", () => {
  const match = branch()
    .get("/", plug)
    .post("/abc", plug)
    .finalize()

  const fm = match("GET", "/")
  exists(fm)
  is(fm!.params, {})
  exists(fm!.petal.handler)

  empty(match("GET", "/abc"))

  const sm = match("POST", "/abc")
  exists(sm)
  is(sm!.params, {})
  exists(sm!.petal.handler)
})

Deno.test("Match with params", () => {
  const match = branch()
    .get("/:abc", plug)
    .post("/a/:foo/b/:bar/c", plug)
    .finalize()

  empty(match("GET", "/"))

  const fm = match("GET", "/def")
  exists(fm)
  is(fm!.params, {
    "abc": "def",
  })
  exists(fm!.petal.handler)

  empty(match("POST", "/a"))
  empty(match("POST", "/a/abc"))
  empty(match("POST", "/a/abc/b"))
  empty(match("POST", "/a/abc/b/def"))

  const sm = match("POST", "/a/abc/b/def/c")
  exists(sm)
  is(sm!.params, {
    "foo": "abc",
    "bar": "def",
  })
  exists(sm!.petal.handler)

  empty(match("GET", "/a/abc/b/def/c"))
  empty(match("POST", "/a/abc/b/def/c/ghi"))
})

Deno.test("Match overwritten handler", () => {
  const match = branch()
    .get("/:one/:two", plug)
    .get("/:three/:four", plug)
    .finalize()

  const { params } = match("GET", "/foo/bar")!
  is(params, {
    "three": "foo",
    "four": "bar",
  })
})

Deno.test("Different handlers for methods", async () => {
  const req = new Request("http://localhost")
  const match = branch()
    .get("/:one/:two", () => fall(240))
    .post("/:three/:four", () => fall(241))
    .finalize()

  const get = match("GET", "/abc/def")!
  is(get.params, {
    "one": "abc",
    "two": "def",
  })
  is(
    (await run(get.petal.handler, (req) => ({
      req,
    }), req)).status,
    240,
  )

  const post = match("POST", "/hij/klm")!
  is(post.params, {
    "three": "hij",
    "four": "klm",
  })
  is(
    (await run(post.petal.handler, (req) => ({
      req,
    }), req)).status,
    241,
  )
})
