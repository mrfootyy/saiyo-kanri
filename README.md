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
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anon key |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook for notifications |

## Supabase Setup

Run `supabase/recruitment_state.sql` in the Supabase SQL editor before using persistent recruitment state.

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. Keep the framework preset as Next.js. The repo includes `vercel.json` with `npm run build`.
3. Add the environment variables listed above.
4. Deploy.

The project uses Next.js Route Handlers for AI, Slack, and Supabase APIs, so it should be deployed as a normal Vercel Next.js app rather than a static export.

## Production Notes

Vercel Functions have a 4.5MB request/response payload limit, so document uploads are limited to 3MB before sending files to the AI extraction API.

## Useful Commands

```bash
npm run build
npm run start
```
