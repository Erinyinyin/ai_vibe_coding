# Blog System MVP Proposal

## Summary

Build a small, server-rendered blog with Python Flask and SQLite. Visitors can read published posts. A user can register and log in, and only authenticated users can create posts. The initial version focuses on a dependable local setup and persistent storage when deployed to Comrite Cloud.

## Goals

- Provide a simple registration and login flow.
- Allow only logged-in users to create blog posts.
- Display a public list of posts and individual post pages.
- Store users and posts in SQLite with safe, parameterized database access.
- Persist the database in the directory named by `COMRITE_CLOUD_DATA_VOLUME`, falling back to `/app/data`.
- Include automated tests to protect authentication, authorization, post handling, and persistence configuration.
- Document installation, setup, and operation in a project README.

## Out of scope for the MVP

- Rich-text or Markdown editing, comments, likes, tags, search, image uploads, password reset, email verification, roles/administration, and multi-author editing.
- A JavaScript SPA or separate API service.
- Production hosting configuration beyond the data-volume integration and deployment notes.

## Proposed user experience

1. A visitor opens the home page and sees recent posts, with a clear empty state if no posts exist.
2. A visitor can open a post and follow links to register or log in.
3. A registered user logs in and is redirected to the post list.
4. An authenticated user uses a protected “New post” form to enter a title and body, then publishes it.
5. The public post list and detail pages show the author and publication time. The user can log out.

## Acceptance criteria

- Registration creates an account and stores only a password hash, never a plaintext password.
- Duplicate usernames and invalid submissions show a useful form error without creating a user.
- Login succeeds with the correct credentials and fails safely with incorrect credentials.
- Anonymous requests cannot access post creation or submit a post successfully.
- An authenticated user can publish a valid post, which appears on the public list and detail page.
- User-supplied content is rendered safely (HTML is escaped by default).
- The SQLite database is created beneath `COMRITE_CLOUD_DATA_VOLUME`; when unset, the configured fallback is `/app/data`.
- Tests use an isolated temporary database and verify the core flows without touching persistent production data.
- The README explains setup, running, testing, configuration, and deployment storage behavior.

## Proposed implementation

Use Flask, Python's built-in `sqlite3`, and Jinja templates. Keep the application small and modular: application factory/configuration, database helpers/schema, authentication routes, post routes, templates, and tests. Use Flask's signed session cookie for login state and Werkzeug password hashing utilities. Protect state-changing forms with CSRF tokens (via Flask-WTF or a small vetted Flask CSRF extension); use secure cookie settings suitable for deployment.

The production database path is derived from `COMRITE_CLOUD_DATA_VOLUME` (default `/app/data`) and the app creates the directory if needed. Tests override the database path to a temporary location.

## Risks and mitigations

- **Weak or missing deployment secret:** Require/document a stable `SECRET_KEY` outside local development; never commit production secrets.
- **Data lost across restarts:** Create SQLite files under the configured mounted volume, not the application source directory.
- **Unauthorized post creation:** Require authentication on the server-side route, not only in the UI; test anonymous requests.
- **Cross-site request forgery:** Apply CSRF protection to registration, login, and post forms.
- **Unsafe HTML in post content:** Render plain text with template autoescaping; do not mark user content safe.
- **SQLite concurrency/backup constraints:** Keep the MVP single-instance oriented and recommend regular backups of the mounted data directory.

## Review decisions

Please review these assumptions before implementation:

- Username-based accounts and no email verification.
- Posts are immediately public after submission; no draft workflow.
- Posts are immutable in the MVP (no edit/delete routes).
- Public read access, authenticated create access.
- Plain-text post bodies rather than Markdown or rich text.
- The exact architecture document filename is `archtirecutre.md`, matching the requested name.
