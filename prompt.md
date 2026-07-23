Build a secured Express.js API with Supabase authentication. Requirements:

- Node.js + Express, ES modules
- Supabase JS SDK for auth, using SUPABASE_URL and SUPABASE_KEY from a .env file
- Routes:
  - POST /auth/signup - body {email, password}, creates a Supabase user, returns 201 with the user
  - POST /auth/login - body {email, password}, returns 200 with access_token and refresh_token
  - POST /auth/logout - requires a bearer token, ends the session, returns 204
  - GET /protected/profile - requires a valid bearer token, returns the user's id/email
  - GET /public/info - no auth needed, returns a welcome message
- Missing email/password on signup or login should return 400
- Wrong credentials on login should return 401
- Missing or invalid token on protected routes should return 401
- Extract the token-checking logic into reusable middleware so I can protect more than one route with it
- Set up Swagger UI at /docs with bearer token support so I can test protected routes from the browser
