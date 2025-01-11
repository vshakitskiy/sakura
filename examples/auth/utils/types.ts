import { z } from "zod"

export const signUp = z.object({
  username: z.string().min(5).max(24),
  email: z.string().email().nonempty(),
  password: z.string().min(8).max(24),
})

export const signIn = z.object({
  email: z.string().email().nonempty(),
  password: z.string().min(8).max(24),
})

export const user = z.object({
  id: z.string().uuid(),
  username: z.string().min(5).max(24),
  email: z.string().email().nonempty(),
  passwordHash: z.string().nonempty(),
})

export type SignUp = z.infer<typeof signUp>
export type SignIn = z.infer<typeof signIn>
export type User = z.infer<typeof user>
