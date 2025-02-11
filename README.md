# Sakura 🌸 - Blossoming HTTP

![PREVIEW](./preview.png)

[![JSR](https://jsr.io/badges/@vsh/sakura?logoColor=080001&color=ff90a6&labelColor=ff2e57)](https://jsr.io/@vsh/sakura)
[![JSR Score](https://jsr.io/badges/@vsh/sakura/score?logoColor=080001&color=ff90a6&labelColor=ff2e57)](https://jsr.io/@vsh/sakura)

Sakura is a Deno HTTP framework build with zero dependencies and zod validation
support, that grows organically, drawing inspiration from the graceful elegance
of a cherry blossom tree.

## Installation

Install Sakura in your Deno project using this command:

```sh
deno add jsr:@vsh/sakura
```

## Example

```ts
import { bloom, fall, pluck, sakura } from "@vsh/sakura"

// Define the time we started server at
const uptime = Date.now()

// Seed is generated on every request. We can pass any utilities inside of it.
const { branch, seed } = sakura((req, cookies) => ({
  req,
  cookies,
  runtime: Date.now() - uptime,
}))

// Create branch with /ping, /runtime and /secret endpoints
const app = branch()
  .get("/ping", () => fall(200, { message: "pong" }))
  .get("/runtime", ({ seed: { runtime } }) => fall(200, { runtime }))
  .with((seed) => {
    // get cookie for secret
    const { secret } = seed.cookies.get<"secret">()

    if (!secret) {
      // exit mutation with the response
      throw pluck(400, {
        message: "secret is not provided.",
      })
    }

    // return new seed
    return {
      ...seed,
      secret,
    }
  })
  .get("/secret", ({ seed: { secret } }) => fall(200, { secret }))

// start the server
bloom({
  // Seed generator
  seed,
  // Branch to run
  branch: app,

  // Runs on error
  error: () => fall(500, { message: "try again later" }),
  // Runs if petal is not found
  unknown: () => fall(404, { message: "unknown endpoint" }),
  // Runs if Content-type is application/json
  unsupported: () => fall(415, { message: "body must be json" }),

  port: 4040,
  // Log on each request
  logger: true,
})
```

## Philosophy

Sakura's architecture reflects a natural progression from a tiny seed to a fully
blossomed tree mirroring the lifecycle of an HTTP request in a unique and
intuitive way:

- **Seed (Context):**\
  The seed is the starting point, representing the context of your request. The
  context holds the initial data and methods needed throughout the request
  lifecycle.

- **Branches (Routers):**\
  As a tree grows, its branches extend in different directions. In Sakura,
  routers are the branches that direct requests to various parts of your
  application.

- **Petals (Handlers):**\
  The beauty of a sakura tree lies in its petals. In this framework, handlers
  are akin to petals.

- **Seed Mutations (Express-like Middlewares alternative):**\
  Instead of traditional middlewares, Sakura uses “seed mutations”. These are
  functions that transform and update the context (the seed) as the request is
  processed.

- **Falling Petals (Sending a Response):**\
  Just as petals fall from a tree at the end of their bloom, the act of sending
  a response is represented by falling petals.

## Documentation

### Initializing framework utilities

The first step of using Sakura is to initialize the core utilities using `sakura()` function. It takes a seed generator and creates an initial context generator (`seed`) and `branch()` function for creating new branches with the initial context provided.

```ts
import { sakura } from "@vsh/sakura"

// Record when the server started (used to calculate uptime)
const startTime = Date.now()

// Initialize Sakura with a seed generator function
const { seed, branch } = sakura((req, cookies) => ({
  req,     // The original HTTP Request object
  cookies, // Instance for handling cookies

  runtime: Date.now() - startTime, // Calculated runtime
}));

// Now `seed` holds our request context generator,
// and `branch` is our entry point for routing.
```

### Defining routes

Sakura uses branches for routing. A branch is created using the `branch()` function, provided by the `sakura()` initializer. It allows you to register routes for different HTTP methods. Each route is defined with a path, a handler function.

```ts
import { fall } from "@vsh/sakura"

// Define simple endpoints
const app = branch()
  .get("/ping", () => fall(200, { message: "pong" }))
  .get("/runtime", ({ seed: { runtime } }) => fall(200, { runtime }));
```

**Using Zod schemas to validate requests**

When defining routes, you can pass Zod schemas as an optional third parameter. Body validation will only work for methods like `POST`, `PUT`, `PATCH` AND `DELETE`.

```ts
import { z } from "npm:zod"
import { fall } from "@vsh/sakura"

// Define a schema for a user object
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
})

// Create a POST endpoint that validates the request body against the schema
const app = branch()
  .post(
    "/user",
    ({ seed, body }) => {
      // Here, "body" has already been validated and parsed by Zod
      return fall(200, { data: body })
    },
    { body: userSchema } // The third parameter: Zod schema for validation
  )
```
<!-- TODO: docs -->
> ...WIP
