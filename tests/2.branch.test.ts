import { fall } from "@vsh/sakura"
import { baseSeed, empty, exists, is, plug, run } from "./utils.ts"

const { branch, seed } = baseSeed()

Deno.test("Match with no params", () => {
  const b = branch()
    .get("/", plug)
    .post("/abc", plug)

  const fm = b.match("GET", "/")
  exists(fm)
  is(fm!.params, {})
  exists(fm!.handler)

  empty(b.match("GET", "/abc"))

  const sm = b.match("POST", "/abc")
  exists(sm)
  is(sm!.params, {})
  exists(sm!.handler)
})

Deno.test("Match with params", () => {
  const b = branch()
    .get("/:abc", plug)
    .post("/a/:foo/b/:bar/c", plug)

  empty(b.match("GET", "/"))

  const fm = b.match("GET", "/def")
  exists(fm)
  is(fm!.params, {
    "abc": "def",
  })
  exists(fm!.handler)

  empty(b.match("POST", "/a"))
  empty(b.match("POST", "/a/abc"))
  empty(b.match("POST", "/a/abc/b"))
  empty(b.match("POST", "/a/abc/b/def"))

  const sm = b.match("POST", "/a/abc/b/def/c")
  exists(sm)
  is(sm!.params, {
    "foo": "abc",
    "bar": "def",
  })
  exists(sm!.handler)

  empty(b.match("GET", "/a/abc/b/def/c"))
  empty(b.match("POST", "/a/abc/b/def/c/ghi"))
})

Deno.test("Match overwritten handler", () => {
  const b = branch()
    .get("/:one/:two", plug)
    .get("/:three/:four", plug)

  const { params } = b.match("GET", "/foo/bar")!
  is(params, {
    "three": "foo",
    "four": "bar",
  })
})

Deno.test("Different handlers for methods", async () => {
  const req = new Request("http://localhost")
  const b = branch()
    .get("/:one/:two", () => fall(240))
    .post("/:three/:four", () => fall(241))

  const get = b.match("GET", "/abc/def")!
  is(get.params, {
    "one": "abc",
    "two": "def",
  })
  is(
    (await run(get.handler.petal, seed, req)).status,
    240,
  )

  const post = b.match("POST", "/hij/klm")!
  is(post.params, {
    "three": "hij",
    "four": "klm",
  })
  is(
    (await run(post.handler.petal, seed, req)).status,
    241,
  )
})
