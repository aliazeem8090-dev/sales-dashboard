# AI Edge Function

This replaces the Railway/NestJS chat endpoints:

- `POST /chat/review-proposal`
- `POST /chat/message`
- `POST /chat/weekly-summary`

Set required secrets before deploy:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

Deploy from `backend/`:

```bash
supabase functions deploy ai
```

Invoke from the frontend with:

```ts
await supabase.functions.invoke('ai', {
  body: { action: 'message', message, context },
})
```
