import { branch } from "@/sakura.ts"
import { pluck } from "@vsh/sakura"

const protect = branch()
  .with(async (seed) => {
    const header = seed.req.headers
    const auth = header.get("Authorization")
    if (!auth) {
      throw pluck(401, {
        message: "Authorization header is not provided.",
      })
    }
    const [type, token] = auth.split(" ")
    if (type !== "Bearer" || !token) {
      throw pluck(401, {
        message: "Authorization header is invalid.",
      })
    }

    const { id } = await seed.jwt.extract<{ id: string }>(token)
    const user = await seed.kv.getUser(id)

    return {
      ...seed,
      user,
    }
  })

export default protect
