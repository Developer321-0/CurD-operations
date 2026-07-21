# FlyRank Task API — Assignment 1 (in-memory CRUD)

**Assignment 1 (Backend Track, Week 2):** a small API that manages a
to-do list — create, read, update, and delete tasks — tested in Swagger
UI. Data lives in memory (a JS array), so it's gone on restart. That's
by design: Week 3 (A2) fixes it with SQLite.

## How to run it

```bash
npm install
npm start
```

Server starts on `http://localhost:3000`. Swagger UI (interactive docs)
is at `http://localhost:3000/docs`.

To run the automated checkpoint suite instead of curl-ing by hand:

```bash
npm test
```

## Endpoints

| Method | Path          | Notes                                          |
|--------|---------------|--------------------------------------------------|
| GET    | `/`           | API description                                 |
| GET    | `/health`     | `{"status": "ok"}`                              |
| GET    | `/tasks`      | list all; supports `?done=true`, `?search=milk` |
| GET    | `/tasks/:id`  | one task; 404 if unknown                        |
| POST   | `/tasks`      | create; 400 if `title` missing/empty            |
| PUT    | `/tasks/:id`  | update `title`/`done`; 404 if unknown, 400 if invalid body |
| DELETE | `/tasks/:id`  | 204 on success; 404 if unknown                  |
| GET    | `/stats`      | `{"total": n, "done": n, "open": n}` (extra)    |
| POST   | `/reset`      | restores the 3 example tasks (extra)            |

## Example curl output

```
$ curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Buy milk","done":false}
```

## Swagger UI

`GET /docs` serves interactive documentation generated from
`openapi.json`. Every endpoint is listed with a "Try it out" button that
sends real requests to the running server — the full CRUD cycle
(create → read → update → delete) works there with no curl needed.

> **Screenshot:** add your own screenshot of `/docs` here
> (`docs/swagger-screenshot.png`) — this repo was built in a headless
> environment, so the visual capture needs to happen locally: run
> `npm start`, open `http://localhost:3000/docs`, and screenshot it.

## The mortality experiment

Created a task, restarted the server, and called `GET /tasks` again:
the new task was gone, back down to the 3 seeded examples. That's not a
bug — a plain JS array only exists inside the running process's memory,
so when the process exits, so does the array. This observation is the
entire reason Assignment 2 (SQLite persistence) exists. It's proven
automatically in `test_checkpoints.js`.

## Extras built

- **Filter:** `GET /tasks?done=true`
- **Search:** `GET /tasks?search=milk`
- **Stats:** `GET /stats`
- **Reset:** `POST /reset` restores the 3 example tasks — handy for demos

## Project structure

```
server.js              # Express app: all CRUD routes
openapi.json            # OpenAPI 3.0 spec, served at /docs via Swagger UI
test_checkpoints.js     # automated version of every checkpoint in the assignment
package.json
.gitignore
```

## Checkpoints verified

- `GET /` and `GET /health` return 200 + correct JSON shapes.
- `GET /tasks/1` → 200, `GET /tasks/99` → 404 + `{"error": "Task 99 not found"}`.
- `POST /tasks` with a valid title → 201 + the new task; empty body → 400.
- Full cycle (create → update → mark done → delete) confirmed via `GET /tasks`
  at each step, with `201`/`200`/`204`/`404` all correct.
- `/docs` lists every endpoint; "Try it out" works for the full CRUD cycle.
- In-memory data is confirmed lost on restart (see above).
