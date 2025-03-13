import { branch } from "@/sakura.ts"
import { pluck } from "@vsh/sakura"

const protect = branch().with(async (seed) => {
  const token = seed.cookies.get()["accessToken"]

  if (!token) {
    throw pluck(401, {
      message: "Unauthorized.",
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
