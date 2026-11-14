# Flask + SQLite Blog

A small server-rendered blog MVP built with Python, Flask, and SQLite. Visitors can read posts; registered users can log in and publish posts. Only authenticated users can create posts.

## Requirements

- Python 3.10 or newer
- `pip`

## Get started

From this directory, create and activate a virtual environment:

```sh
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```sh
pip install -r requirements.txt
```

Set a session signing key and start the development server:

```sh
export SECRET_KEY="replace-with-a-random-local-development-value"
flask --app app:create_app run --debug
```

Open <http://127.0.0.1:5000> in a browser. Register an account, log in, then use **New post** to publish.

> Do not use the example development secret in production. Configure a long, random, stable `SECRET_KEY` through your deployment's secret manager.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `COMRITE_CLOUD_DATA_VOLUME` | Directory for persistent application data and the SQLite database | `/app/data` |
| `SECRET_KEY` | Flask session signing key | Must be set for a secure deployment |

The app stores its SQLite database as `blog.sqlite3` inside the configured data directory. On Comrite Cloud, mount persistent storage and set `COMRITE_CLOUD_DATA_VOLUME` to the mounted path. The app creates the directory if needed. If the variable is omitted or empty, it uses `/app/data`.

For local development, set `COMRITE_CLOUD_DATA_VOLUME` to a directory you can write to, or rely on the documented `/app/data` default if available. Keep the live database and production secrets out of source control. Back up the persistent data directory regularly.

## Run tests

Install the dependencies above, then run:

```sh
pytest
```

Tests should use an isolated temporary database and must not read or modify the persistent application database.

## Security notes

- Passwords are stored as hashes, not plaintext.
- Login state is held in a signed session cookie.
- Post creation is protected on the server and requires login.
- Form submissions use CSRF protection.
- User-authored post content is plain text and rendered with template autoescaping.
- SQLite is appropriate for a small, single-instance deployment. For multiple concurrent app instances, use a server database such as PostgreSQL rather than sharing a SQLite file across replicas.
