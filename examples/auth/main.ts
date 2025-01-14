import "jsr:@std/dotenv/load"

import { bloom, fall } from "@vsh/sakura"
import { branch, MessageError, seed } from "@/sakura.ts"
import { ZodError } from "zod"
import auth from "@/routers/auth.ts"

const app = branch()
  .get("/ping", () =>
    fall(200, {
      message: "Pong.",
    }))
  .merge("/auth", auth)

export const run = () => {
  return bloom({
    branch: app,
    seed,
    port: 4040,
    logger: true,
    error: ({ error }) => {
      console.log(error)
      if (error instanceof ZodError) {
        console.log(error.issues)
        return fall(400, {
          message: "Body is invalid.",
        })
      } else if (error instanceof MessageError) {
        console.log(error.message)
        return fall(500, {
          message: error.message,
        })
      }

      return fall(500, {
        message: "Try again later.",
      })
    },
    unknown: () =>
      fall(404, {
        message: "Unknown endpoint.",
      }),
    unsupported: () =>
      fall(415, {
        message: "Content-Type must be application/json.",
      }),
  })
}

if (import.meta.main) {
  run()
}
