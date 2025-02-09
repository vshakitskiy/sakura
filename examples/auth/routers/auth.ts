import { branch } from "@/sakura.ts"
import { fall } from "@vsh/sakura"
import { signIn, signUp } from "@/utils/types.ts"
import session from "@/routers/session.ts"

const auth = branch()
  .post("/signup", async ({ seed, body }) => {
    await seed.kv.insertUser(body)
    return fall(201)
  }, { body: signUp })
  .post("/signin", async ({ seed, body: { email, password }, cookies }) => {
    const user = await seed.kv.getUserByEmail(email)
    if (!user) return fall(401, "User with this email does not exists.")

    const verify = await seed.bcrypt.verify(password, user.passwordHash)
    if (!verify) return fall(401, "Invalid password.")

    const accessToken = await seed.jwt.sign({
      id: user.id,
    }, seed.jwt.day * 3)

    cookies.set({
      name: "accessToken",
      value: accessToken,
      path: "/auth/session",
    })
    return fall(200, user)
  }, { body: signIn })
  .merge("/session", session)

export default auth
