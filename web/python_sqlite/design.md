# Blog System MVP Design

## Product direction

A calm, readable, lightweight blog. Prioritize readable long-form text and obvious account/post actions over dashboards, animations, or complex content tooling. The UI is server-rendered and works without JavaScript.

## Navigation

- **Brand/Home** — always links to the public post list.
- **Logged out:** Register, Log in.
- **Logged in:** New post, Log out, plus a small “Signed in as …” label.
- The current page title is reflected in the document title and main heading.

## Pages and states

### Home / post list (`/`)

- Header/navigation bar.
- Main heading “Latest posts”.
- Posts shown newest first as simple linked cards/rows with title, author, and formatted date; show a short excerpt only if a concise, safe excerpt rule is included.
- Empty state: explain that no posts have been published yet; signed-in users get a “Write the first post” link.

### Post detail (`/posts/<id>`)

- Breadcrumb/back link to the post list.
- Post title, author, and date above the body.
- Body displayed as plain text with preserved line breaks; HTML remains escaped.
- Missing ids return a standard not-found page.

### Register (`/register`)

- Username and password fields, visible labels, and inline/server-rendered validation errors.
- Explain that the username is public as the post author name.
- Link to the login page for existing users.

### Log in (`/login`)

- Username and password fields and a clear generic invalid-credentials message.
- Link to registration.
- Successful login returns to the post list (or a validated local return path if implemented safely).

### New post (`/posts/new`)

- Protected by server-side authentication.
- Title input and multiline body textarea with labels and helpful length guidance.
- Publish button and cancel/back link.
- Validation errors preserve non-sensitive submitted fields; after successful publish, redirect to the new post.
- An anonymous visitor following a protected link is sent to login, then returned to the intended page only if the return URL is validated as local.

## Visual system

- **Layout:** centered content column around 44–52rem wide; responsive padding for small screens.
- **Typography:** system sans-serif for navigation and controls; readable body size and line height for posts. Use clear heading scale and restrained font weights.
- **Color:** light warm-neutral page background, white content surface, dark charcoal text, muted metadata, and one accessible blue/teal accent for links and primary actions. Keep contrast at WCAG AA levels.
- **Components:** compact header, bordered post cards, consistent form fields, visible focus rings, primary/secondary buttons, and simple inline error/success notices.
- **Responsive behavior:** navigation wraps or stacks on narrow screens; forms and post content stay within viewport width; touch targets remain comfortable.
- **Motion:** none required. Interactions must be usable with keyboard and reduced-motion preferences.

## Accessibility and content handling

- Use semantic landmarks and heading order, explicit form labels, keyboard-visible focus, and descriptive link/button text.
- Associate field errors with inputs and provide an error summary or clear page-level message where appropriate.
- Do not depend on color alone to convey errors or authentication state.
- Use ordinary HTML text rendering with autoescaping. Preserve body line breaks with CSS (`white-space: pre-wrap`) rather than injecting markup.

## Interaction and error behavior

- Successful form submissions use Post/Redirect/Get to avoid duplicate posts on refresh.
- Invalid forms re-render with an explanation and appropriate status.
- A duplicate username is handled inline; login errors do not reveal whether a username exists.
- Unauthenticated post creation redirects to login; forbidden or missing content receives a clear response.
- Logout is a POST form protected against CSRF, rather than a state-changing GET link.
