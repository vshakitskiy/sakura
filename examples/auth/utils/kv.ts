import type { SignUp, User } from "@/utils/types.ts"
import { genSalt, hash } from "bcrypt"
import { MessageError } from "@/sakura.ts"

export class Kv {
  public readonly kv: Deno.Kv
  private salt: string

  constructor(kv: Deno.Kv, salt: string) {
    this.kv = kv
    this.salt = salt
  }

  static init = async () => new Kv(await Deno.openKv(), await genSalt(8))

  public insertUser = async ({ username, email, password }: SignUp) => {
    const id = crypto.randomUUID()
    const primaryKey = ["users", id]
    const byEmailKey = ["users_by_email", email]
    const passwordHash = await hash(password, this.salt)

    const user = {
      id,
      username,
      email,
      passwordHash,
    }

    const result = await this.kv
      .atomic()
      .check({ key: primaryKey, versionstamp: null })
      .check({ key: byEmailKey, versionstamp: null })
      .set(primaryKey, user)
      .set(byEmailKey, user)
      .commit()

    if (!result.ok) {
      throw new MessageError("User with ID or email already exists.")
    }

    return id
  }

  public getUser = async (id: string) =>
    (await this.kv.get<User>(["users", id])).value

  public getUserByEmail = async (email: string) =>
    (await this.kv.get<User>(["users_by_email", email])).value
}
