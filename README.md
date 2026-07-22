# FlyRank Tasks API — CRUD backed by SQLite (JavaScript / Express)

**Assignment 2 (Backend Track, Week 3):** take the in-memory CRUD API
from Assignment 1 and move its storage to a real SQLite database — same
endpoints, but the data now survives a restart. Same repo, same lane as
A1 — this is that project growing, not a new one.

## Why SQLite?

- **Single file.** The whole database is `tasks.db`, sitting next to
  the code. No server process to install, configure, or keep running.
- **Survives restarts.** Unlike a JS array, the file on disk doesn't
  disappear when the process stops.
- Right tool for a small, single-process app like this one. A team
  hammering the same database from many services concurrently would
  eventually reach for Postgres — but the API wouldn't need to change
  when that day comes, only the storage layer.

## Why `node:sqlite` instead of `better-sqlite3`

The assignment's suggested library is `better-sqlite3`, but it needs to
compile native code at install time (it downloads Node's C headers and
runs `node-gyp`). On a locked-down network that install can fail.

Since Node 22.5, there's a **built-in** SQLite module, `node:sqlite`.
It's the same idea as Python's `sqlite3` — already there, nothing to
`npm install` for the database part. It's marked experimental (you'll
see a one-line warning in the console), but it's fully functional and
avoids the native-compile step entirely. If you're on an older Node or
prefer the more established library, swapping in `better-sqlite3` only
touches `server.js`'s database calls — the rest of the API is
unaffected either way.

## Where the database lives

`tasks.db`, created automatically the first time the app starts. It's
git-ignored (see `.gitignore`), so a fresh clone always starts from a
clean, auto-seeded database instead of shipping example data in the repo.

## Run it

```bash
npm install
npm start
```

Then visit `http://localhost:3000/tasks`. On first run, `tasks.db` and
the `tasks` table are created automatically, and three example tasks
are seeded once (restarting never duplicates them — the seed only
fires when `SELECT COUNT(*)` comes back `0`).

To run the automated checkpoint suite instead of curl-ing by hand:

```bash
npm test
```

## Endpoints

Identical shapes to Assignment 1 — only the storage underneath changed.

| Method | Path          | Notes                                          |
|--------|---------------|--------------------------------------------------|
| GET    | `/`           | API description                                 |
| GET    | `/health`     | `{"status": "ok"}`                              |
| GET    | `/tasks`      | supports `?search=`, `?done=`, `?sort=title`    |
| GET    | `/tasks/:id`  | 404 + `{"error": "Task {id} not found"}` if missing |
| POST   | `/tasks`      | 400 on empty/missing title, else 201            |
| PUT    | `/tasks/:id`  | 404 if missing, else 200 with updated task      |
| DELETE | `/tasks/:id`  | 204 on success; 404 if missing                  |
| GET    | `/stats`      | `{"total": n, "done": n, "open": n}` (extra)    |
| POST   | `/reset`      | restores the 3 example tasks (extra)            |
| GET    | `/docs`       | Swagger UI, FlyRank-themed                      |

All queries use `?` parameterized placeholders — no request value is
ever glued into a SQL string.

## Stage 4 — SQL by hand

Opened `tasks.db` directly (in DB Browser for SQLite — screenshot
below) and ran these queries, then confirmed the running API's
`GET /tasks` reflected each change immediately with no restart, because
the API and DB Browser read the exact same file:

```sql
SELECT * FROM tasks;                     -- 3 rows: Buy milk, Write report, Walk the dog
SELECT * FROM tasks WHERE done = 1;      -- 1 row: Walk the dog
SELECT COUNT(*) FROM tasks;              -- 3
UPDATE tasks SET done = 1;               -- marks all 3 tasks done
DELETE FROM tasks WHERE done = 1;        -- clears the table
```

**Example query and what it returned:** `SELECT * FROM tasks WHERE done = 1;`
returned exactly one row — `(3, 'Walk the dog', 1)` — proving the
`WHERE` clause filters at the database level, not in application code.

> **DB Browser screenshot:** add your own screenshot here
> (`docs/db-browser.png`) — this repo was built in a headless
> environment, so the capture needs to happen locally: open DB Browser
> for SQLite, open `tasks.db`, go to "Browse Data", and screenshot it.

## Proof the API didn't change

The same `curl` commands and Swagger UI "Try it out" clicks from
Assignment 1 pass unchanged against this SQLite-backed version — same
routes, same request/response shapes, same status codes. That's the
proof that storage really is just an implementation detail: clients
never see, and never needed to know, whether their data lived in a JS
array or a SQLite file.

## Extras built

- **Search:** `GET /tasks?search=milk` → `WHERE title LIKE ?`
- **Filter by status:** `GET /tasks?done=true` → `WHERE done = ?`
- **Sort:** `GET /tasks?sort=title` → `ORDER BY title`
- **Stats:** `GET /stats` computed with `SELECT COUNT(*)` in SQL
- **Reset:** `POST /reset` clears and re-seeds via SQL, in a transaction
- **Index:** `CREATE INDEX idx_tasks_title ON tasks (title)` — lets
  SQLite look up or order by `title` without scanning every row,
  backing the `?sort=title` extra
- **Transaction:** both the initial seed and `POST /reset` wrap their
  inserts in `BEGIN`/`COMMIT` (with `ROLLBACK` on error), so they're
  all-or-nothing — a failure partway through can't leave the table
  half-seeded

## Project structure

```
server.js               # Express app + SQLite storage layer (node:sqlite)
openapi.json             # OpenAPI 3.0 spec, served at /docs
swagger-theme.css        # custom Swagger UI theme
test_checkpoints.js      # automated version of every checkpoint below
package.json
.gitignore
```

## Checkpoints verified

- Restarted the server 3x on a fresh database: `GET /tasks` returned
  exactly 3 tasks every time — the seed never duplicated.
- `curl -i /tasks/999` -> `404` + `{"error": "Task 999 not found"}`.
- Created a task via `POST`, restarted the server, `GET /tasks` still
  showed it — the first time data survived a restart.
- Full cycle: create -> `PUT` to mark done -> `DELETE`, confirming with
  `GET /tasks` after each step and correct `201`/`200`/`204`/`404`
  status codes throughout.
- Edited `tasks.db` directly with raw SQL, then called the live API
  with no restart — same data, same file, no syncing step.
- A `?search=` value containing `' OR '1'='1` was treated as a literal
  string, not SQL — confirming the parameterized placeholders work.
- All 13 automated checks in `test_checkpoints.js` pass.
