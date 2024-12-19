# Sakura 🌸 (WIP)

TODO: README

## Example

```ts
import { bloom, fall, sakura } from "@vsh/sakura"

// Define the time we started server at
const time = Date.now()

// Seed is generated on every request. We can pass any utilities inside of it.
const { branch, seed } = sakura((req) => ({
  req,
  runtime: Date.now() - time,
}))

// Create branch with /ping & /runtime endpoints
const main = branch()
  .get("/ping", () => fall(200, { message: "pong" }))
  .get("/runtime", (_, { runtime }) => {
    console.log(Date.now())
    return fall(200, { runtime })
  })

// start the server
bloom({
  // Seed generator
  seed,
  // Main branch
  branch: main,

  // Runs on error
  error: () => fall(500, { message: "try again later" }),
  // Runs if petal is not found
  unknown: () => fall(404, { message: "unknown endpoint" }),

  port: 4040,
  log: true,
})
```
