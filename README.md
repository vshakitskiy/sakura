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

## About

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

### Initializing Framework Utilities

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

### Defining Routes

Sakura uses branches for routing. A branch is created using the `branch()` function, provided by the `sakura()` initializer. It allows you to register routes for different HTTP methods. Each route is defined with a path, a handler function.

```ts
import { fall } from "@vsh/sakura"

// Define simple endpoints
const app = branch()
  .get("/ping", () => fall(200, { message: "pong" }))
  .get("/runtime", ({ seed: { runtime } }) => fall(200, { runtime }));
```

**Zod schemas to validate requests**

When defining routes, you can pass Zod schemas as an optional third parameter. These schemas will be used to validate and parse the request body, parameters and queries. Body validation will only work for methods like `POST`, `PUT`, `PATCH` AND `DELETE`.

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

### Using Mutations

Instead of traditional middleware, Sakura uses "Seed Mutation". Mutations let you transform the seed before it reaches your endpoint handler. This is useful for tasks such authentacation or adding extra information to a context. With `.with()` method transforms the request's seed.

```ts
import { fall, pluck } from "@vsh/sakura"

const app = branch()
  .with((seed) => {
    // Retrieve a secret from cookies
    const { secret } = seed.cookies.get<"secret">()
    
    // If the secret is not provided, terminate the request early
    if (!secret) {
      throw pluck(400, { message: "Secret is not provided." })
    }
  
    // Otherwise, add the secret to the seed and continue processing
    return { ...seed, secret }
  })
  // Define a secured endpoint that requires the secret cookie
  .get("/secret", ({ seed: { secret } }) => fall(200, { secret }))
```

### Sending a Response

Sakura provides helper functions to send responses:
- **fall(status, json, headers):**\
Constructs and returns a JSON response. It automatically sets the `Content-Type` header as `application/json`.
- **pluck(status, json, headers):**\
Constructs and returs a custom `SakuraError`, which is useful in mutations when you need to abort processing and send an error response.

```ts
import { fall, pluck } from "@vsh/sakura"

// Simple endpoint returning a JSON response
app.get("/ping", () => fall(200, { message: "pong" }))

// Using pluck in a mutation for error handling
app.with((seed) => {
  if (!seed.user) {
    throw pluck(401, { message: "Unauthorized" })
  }
  return seed
})
```

### Starting a Server

Once you've defined your routes, mutations, and response handlers, the final step is to start the server using the `bloom()` function. This function ties everything and starts the Deno HTTP server.

```ts
import { bloom } from "@vsh/sakura"

// Start the server with a custom configuration
bloom({
  seed,        // Seed generator from our initialization
  branch: app, // Our routing branch (could be `app` or `securedApp`)
  port: 4040,  // Port number where the server listens
  error: ({ error, seed }) =>
    // Global error handler for unexpected errors
    fall(500, { message: "Internal server error" }),
  unknown: ({ req, seed }) =>
    // Handler for unknown endpoints
    fall(404, { message: "Endpoint not found" }),
  unsupported: ({ req, seed }) =>
    // Handler for unsupported content types
    fall(415, { message: "Unsupported Media Type" }),
  logger: true, // Enable logging for each request
});
```

### Cookies

Sakura integrates cookie management through its dedicated `Cookies` utility. When a request comes in, a `Cookies` instance is created from the request headers and passed along in your handler. Tis lets you easily read, set and delete cookies as part of your handler logic.

```ts
branch()
  .get("/check", ({ cookies }) => {
    // Retrieve the "session" cookie (with type hinting)
    const session = cookies.get<"session">()
    return fall(200, { session })
  })
  .get("/visit", ({ cookies }) => {
    // Set a new cookie called "visited" with a max age of 1 hour
    cookies.set({ name: "visited", value: "true", maxAge: 3600 })
    return fall(204)
  })
  .get("/logout", ({ cookies }) => {
    // Delete the "session" cookie
    cookies.deleteCookie("session", { path: "/" })
    return fall(200, { message: "Logged out" })
  })
```

### Testing

Sakura provides an HTTP client - `SakuraClient`. It allows you to simulate HTTP requests with your application. This is especially useful for testing your routes or integrating a client-side library without needing an external HTTP client.

The client is initialized with your application branch and the seed generator. Once created, you can use methods to send requests.

```ts
import { SakuraClient } from "@vsh/sakura/client"

const client = new SakuraClient(app, seed)

const ping = await client.get("/ping")
console.log(ping!.body) // { message: "pong" }

const user = await client.post("/user", { body: { name: "Alice", age: 30 } })
console.log(user!.body) // Contains the validated user data or an error message
```
