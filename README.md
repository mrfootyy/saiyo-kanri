# Saiyo Kanri

Next.js 16 app for recruitment management.

## Getting Started

Create `.env.local` from `.env.example` and fill in the values:

```bash
cp .env.example .env.local
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables for Production, Preview, and Development as needed.

| Name | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | AI candidate summary and resume extraction |
| `OPENAI_MODEL` | No | Candidate summary model. Defaults to `gpt-5.4-mini` |
| `OPENAI_RESUME_MODEL` | No | Resume extraction model. Defaults to `gpt-4o-mini` |
| `OPENAI_TRANSCRIPTION_MODEL` | No | Interview recording transcription model. Defaults to `gpt-4o-mini-transcribe` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anon key |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook for notifications |

## Supabase Setup

Run `supabase/recruitment_state.sql` in the Supabase SQL editor before using persistent recruitment state.

## Login Setup

The app uses Supabase Auth with email/password login. Users can sign in, sign up, and request password reset emails from `/login`.

In Supabase Dashboard > Authentication > URL Configuration, set the production Vercel URL as the Site URL and add it to Redirect URLs. For local testing, add `http://localhost:3000/login`.

After updating `supabase/recruitment_state.sql`, run it again in the Supabase SQL editor so `recruitment_state` is available only to authenticated users.

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. Keep the framework preset as Next.js. The repo includes `vercel.json` with `npm run build`.
3. Add the environment variables listed above.
4. Deploy.

The project uses Next.js Route Handlers for AI, Slack, and Supabase APIs, so it should be deployed as a normal Vercel Next.js app rather than a static export.

## Run with Docker

Build and run the production container:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The compose file reads `.env.local`, so create it from `.env.example` first.

To run without Compose:

```bash
docker build -t saiyo-kanri .
docker run --env-file .env.local -p 3000:3000 saiyo-kanri
```

## Production Notes

Vercel Functions have a 4.5MB request/response payload limit, so document uploads are limited to 3MB before sending files to the AI extraction API.

## Useful Commands

```bash
npm run build
npm run start
```
