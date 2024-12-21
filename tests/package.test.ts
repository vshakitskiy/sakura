// TODO: fill all feature tests

// TODO: transfer test into new file
// Deno.test("matching petals", () => {
//   const { branch } = baseSeed()
//   const basic = branch()
//     .get("/:f", empty)
//     .post("/:f", empty)
//     .get("/:f/test", empty)
//     .post("/part/:f/part/:s", empty)

//   assertFalse(!basic.match("GET", "/abc"))
//   assertFalse(!basic.match("POST", "/def"))
//   assertFalse(basic.match("PUT", "/ghi"))

//   assertFalse(!basic.match("GET", "/abc/test"))
//   assertFalse(basic.match("GET", "/abc/notest"))
//   assertFalse(basic.match("POST", "/abc/test"))

//   assertFalse(!basic.match("POST", "/part/abc/part/efg"))
//   assertFalse(basic.match("POST", "/part/abc/part/efg/part"))

//   const rewrite = branch()
//     .get("/:before", empty)
//     .get("/:after", empty)

//   const match = rewrite.match("GET", "/abc")
//   if (!match) throw new Error("expected match")
//   assertEquals(Object.keys(match.params)[0], "after")
// })
