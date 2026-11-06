# Simplified Syllabus

Turn syllabus text into course details, deadlines, grading, materials, and policies. Students can review and edit the results, save courses, complete tasks, view a combined calendar, and export .ics calendars.

## What is built

- Responsive React/Vite homepage and student workspace.
- Working browser preview: basic text extraction, sample courses, editable deadlines, completion tracking, local persistence, and calendar export.
- Vercel Node APIs: email/password signup and login, hashed persistent sessions, per-user course storage in Neon Postgres, OpenAI structured syllabus extraction, Stripe Checkout, and signed payment webhooks.
- Setup script that creates database tables and an existing paid demo account: `demo@demo.com` / `password123!`.
- Free plan: 3 saved courses and 3 AI attempts in a 30-day quota window. Semester Pro: $9 once for 120 days, 20 saved courses, and 100 AI attempts per 30-day window. Quotas reset 30 days after the first attempt; failed attempts count toward the quota. New accounts have immediate access; email verification is not required.

The hosted Sites preview is the static browser experience. It does not run the Vercel server functions. Deploy this source to Vercel to enable the full account, AI, and payment features. No production service accounts, secrets, or payment products have been created on your behalf.

## 1. Run locally

Install Node.js 22 or later. In the extracted project folder:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite development server provides the browser preview only. To run the server APIs too, install the Vercel CLI and use Vercel dev:

```sh
npm install -g vercel
vercel dev
```

Create a free Vercel account and link this project when prompted. Use `http://localhost:3000` for local testing and set `APP_URL=http://localhost:3000` in `.env.local`. Use `localhost`, not a LAN IP; sessions use Secure cookies. Modern browsers allow Secure cookies on localhost. If your local browser does not, test authentication on your HTTPS Vercel preview deployment.

## 2. Save to GitHub and deploy to Vercel

Create your own GitHub repository, then in this folder:

```sh
git init
git add .
git commit -m "Build Simplified Syllabus"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Import the repository at https://vercel.com/new. Framework: Vite. Build: `npm run build`. Output: `dist`. The included `vercel.json` routes API requests to the Node function. Deploy first to get your HTTPS production address. Continue committing and pushing after each working change; Vercel automatically redeploys pushes.

## 3. Connect Neon and create the demo account

In Vercel, open your project → Storage / Marketplace → Neon Postgres → create/connect a database. Use the database connection URL that Neon supplies. The server uses Neon's HTTP driver, so no direct TCP connection is required.

Set `DATABASE_URL` in Vercel’s project environment variables and in your untracked `.env.local` for setup. If the integration provides another variable name, copy its database URL into `DATABASE_URL`.

Then run locally:

```sh
npm run setup:database
```

This creates `users`, `sessions`, `courses`, `rate_limits`, and `checkout_sessions`; creates the demo account; and seeds three illustrative courses if the demo account has none. It is safe to rerun for this initial schema: it does not remove existing courses, and it restores the designated demo credentials and access. It reconciles course counters. Later schema changes should use explicit migrations rather than editing an applied setup routine.

The demo account bypasses verification because this app does not require verification for any account. It has full paid feature access. Its password is intentionally public; students must use their own accounts for private data. Demo users share one workspace and can change its sample data. Never store personal information in the demo account.

## 4. Connect the AI feature

Create an API key at https://platform.openai.com/api-keys and check the provider's current credit and billing requirements. A ChatGPT subscription does not supply app API usage. Add these variables in Vercel:

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | Your secret OpenAI API key |
| `OPENAI_MODEL` | `gpt-4.1-mini` (default; may be changed to a model supporting strict JSON-schema structured outputs) |

The app calls OpenAI from the server, never the browser. The key stays out of the client bundle. AI imports require a logged-in account, validate result fields and dates, enforce per-user quotas, and show a review screen before saving. The full syllabus is sent to OpenAI when the student chooses to organize it. Review the provider's data policies before your public launch. Do not upload private student information.

When no AI key is configured, the app uses the clearly labeled basic organizer. This extracts explicit English dates, course identifiers, common labeled contact details, grading percentages, materials, and policies. It does not infer a weekly schedule or generate deadlines for undated tasks. Numeric dates use US month/day ordering. Students must check output against the syllabus. Direct PDF/image uploads and automatic LMS synchronization are not implemented; copy text from a PDF or import a .txt file.

## 5. Connect Stripe Checkout

Start in Stripe test mode at https://dashboard.stripe.com.

1. Create a product called **Semester Pro** with a **one-time $9.00 USD Price**. No recurring subscription. Copy the `price_...` ID.
2. Copy your Stripe secret test API key.
3. In Stripe Workbench / Webhooks, add an endpoint at `https://YOUR_APP_DOMAIN/api/webhook` for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Copy the endpoint's signing secret (`whsec_...`).
5. Set these Vercel variables:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret test API key, later your live secret key |
| `STRIPE_PRICE_ID` | The one-time Price ID in the same Stripe mode |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this endpoint and mode |
| `APP_URL` | Your exact HTTPS production origin, such as `https://simplified-syllabus.vercel.app`; no trailing slash |

Redeploy after adding or changing environment variables. Configure each Vercel environment deliberately. A preview domain needs its own matching APP_URL; production webhooks should point at the stable production domain.

Checkout is created server-side. Only a correctly signed, paid webhook for a session created by this app grants 120 days of access. The browser's success redirect never grants access. Duplicate deliveries cannot extend access again. If a webhook arrives after the return page, refresh the workspace to see Pro access. The database's `checkout_sessions.paid_at` and the user's `paid_until` verify the grant. Expired paid access falls back to free limits; existing courses remain accessible.

Use Stripe's test card `4242 4242 4242 4242`, a future expiry, any CVC, and a valid postal code. Test a successful payment, a cancelled checkout, and a failed test payment. Test webhooks using Stripe CLI if desired:

```sh
stripe listen --forward-to localhost:3000/api/webhook
```

For local testing, use the CLI-provided signing secret in `.env.local` and restart `vercel dev`. The Stripe account owner is responsible for refund requests and customer support; this version does not implement automatic refund-driven revocation. Revoke access manually in the database if refunding.

For live payments, complete Stripe business onboarding, create the live product/price, use live API keys and a live webhook endpoint, then redeploy. The course's $1 proof charge is a separate Week 4 action; it has not been made here. To temporarily test a live $1 product, update both the Price ID and displayed pricing before charging. Do not silently charge a different price from the website's advertised amount.

## 6. Check the finished product

- Open the homepage as a stranger; confirm the product, audience, price, and primary action are clear.
- Sign up with your own email, import a syllabus, save the reviewed result, log out, and log back in. The same courses should return, including from another browser.
- Use a second account to confirm that courses are isolated. Editing another account's course ID must return 404.
- Paste a syllabus with an explicit year, an omitted year, an impossible date, an undated task, grading weights, and office hours. Confirm no invented deadlines are saved.
- Edit course details, policies, materials, a deadline and completion status; reload to confirm persistence.
- Export .ics and import it into your calendar app. Events are all-day; original due times are in descriptions. Exports are snapshots, not a live sync.
- Complete a Stripe test checkout and confirm the webhook grants Pro. Repeat the same webhook and confirm paid_until does not change again. Cancelled checkout must not grant access.
- Log in through the normal login with `demo@demo.com` / `password123!`; confirm full paid access. This account already exists after the setup command; graders do not sign up.
- Check desktop and mobile layouts and keyboard navigation.
- Add your actual support contact, privacy policy and terms appropriate to your business before inviting paying customers. Replace illustrative course data only if you want different demo content.

## Validation

```sh
npm test
npm run build
```

The included tests cover grounded extraction, missing/invalid dates, sample data validation, calendar formatting, session token parsing, origin checks, webhook signature tampering/expiry, integration status and anonymous API authorization. Production database, provider calls, signup/login and real Stripe deliveries still need the account setup and live end-to-end checks above. Browser visual QA was unavailable in the build environment.

## Environment variable checklist

| Name | Required for |
| --- | --- |
| `DATABASE_URL` | Accounts, saved courses, sessions, payment records, quotas |
| `OPENAI_API_KEY` | Actual AI organization |
| `OPENAI_MODEL` | Optional model selection |
| `STRIPE_SECRET_KEY` | Checkout |
| `STRIPE_PRICE_ID` | Checkout pricing |
| `STRIPE_WEBHOOK_SECRET` | Verified payment grants |
| `APP_URL` | Cross-site request protection and Stripe return URLs |

Do not paste secrets into source code or commit `.env.local`. `.gitignore` excludes it. Configure secrets through Vercel's environment settings and keep them server-side. Each API write checks the configured origin; user-owned reads and writes require a valid server-side session. Passwords are bcrypt hashed; only hashes of random session tokens are stored.
