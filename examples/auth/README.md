# Example: simple authentication server

This is an example app, that uses Sakura as HTTP framework.

## Utilities

- [zod]("https://zod.dev/") - schema validation
- [djwt]("https://deno.land/x/djwt@v3.0.2") - jwt creation / validation
- [bcrypt]("https://deno.land/x/bcrypt@v0.4.1") - password hashing
- [Deno KV]("https://deno.com/kv") - database

## Endpoints

`GET /ping` - Returns message "Pong."

`POST /auth/signup` - Creates user and returns empty response.

```json
// Body schema
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

`POST /auth/signin` - Authorizes user and returns his data with access token in
the cookie.

```json
// Body schema
{
  "email": "string",
  "password": "string"
}
```

`GET /auth/session` - Returns user data based on access token cookie provided.

`POST /auth/session/out` - Removes user's access token cookie and returns empty
body.
