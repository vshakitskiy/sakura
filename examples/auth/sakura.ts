import { sakura } from "@vsh/sakura"
import { day, extract, sign } from "@/utils/jwt.ts"
import { Kv } from "@/utils/kv.ts"
import { compare } from "bcrypt"

export class MessageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = message
  }
}

const kv = await Kv.init()
export const { seed, branch } = sakura((req, cookies) => ({
  cookies,
  req,
  jwt: {
    sign,
    extract,
    day,
  },
  kv,
  bcrypt: {
    verify: (password: string, hash: string) => compare(password, hash),
  },
}))
