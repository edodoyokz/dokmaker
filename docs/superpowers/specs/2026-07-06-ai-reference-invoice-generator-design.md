# AI Reference Invoice Generator Design

Date: 2026-07-06
Status: Design approved by product owner; pending implementation planning

## Summary

Add a post-MVP feature where a normal user uploads an invoice image reference, gets a limited free AI analysis, describes requested changes, pays wallet balance for each AI image generation/revision, and can immediately download the generated clean image.

This is not part of the existing deterministic invoice template/PDF flow in v1. Generated results are private to the user and are not published to the template catalog.

## Goals

- Let users generate an invoice-like image from their own visual reference and text instructions.
- Charge wallet balance for every image generation or revision.
- Keep analysis free but rate-limited.
- Store session/output history for ownership, download, refund, and support audit.
- Avoid changing the existing invoice PDF/versioning/download-charge flow in v1.

## Non-goals for v1

- Convert generated image into editable DokMaker HTML/CSS templates.
- Add generated designs to the public template catalog.
- Provide form-based editing after image generation.
- Make generated images official invoices from referenced brands or third parties.
- Build a separate AI credit wallet.

## User flow

1. User opens `/app/ai-invoice-generator`.
2. User uploads an invoice reference image.
3. Server validates file type/size and stores it privately.
4. User runs limited free AI analysis.
5. Vision analysis returns a summary of visible layout, colors, sections, and detected text/data.
6. UI asks what the user wants changed.
7. User enters change instructions.
8. UI shows the server-configured generation price.
9. User accepts disclaimer:
   > Hasil dibuat oleh AI berdasarkan referensi dan instruksi pengguna. Pengguna bertanggung jawab penuh atas hak penggunaan, isi, klaim, dan konsekuensi hukum. DokMaker dapat menolak penggunaan yang melanggar hukum atau merugikan pihak lain.
10. User clicks generate.
11. Server checks ownership, online request, disclaimer acceptance, and wallet balance.
12. Server debits wallet and creates the generation output record transactionally with an idempotency key.
13. AI generates one clean image.
14. Output image is stored privately.
15. User can download the generated image for free because the generation was already paid.
16. If user revises, the next generation is charged again.

## Data model additions

### `ai_generation_sessions`

Stores the user's reference and current workflow state.

Suggested fields:
- `id`
- `user_id`
- `status`: `uploaded | analyzed | ready_to_generate | generating | completed | failed`
- `reference_image_storage_key`
- `reference_image_mime_type`
- `reference_image_size_bytes`
- `analysis_json`
- `analysis_summary`
- `latest_user_instruction`
- `disclaimer_accepted_at`
- `created_at`
- `updated_at`

### `ai_generation_outputs`

Stores each paid generation attempt.

Suggested fields:
- `id`
- `session_id`
- `user_id`
- `status`: `pending | generating | success | failed | refunded`
- `instruction_snapshot`
- `analysis_snapshot`
- `prompt_snapshot`
- `output_image_storage_key`
- `output_image_mime_type`
- `charged_amount`
- `currency`
- `wallet_ledger_entry_id`
- `refund_ledger_entry_id`
- `idempotency_key`
- `provider`
- `provider_request_id`
- `provider_metadata`
- `error_message`
- `created_at`
- `updated_at`

### Wallet ledger

Add a wallet ledger entry type:
- `ai_generation_debit`

Use existing `refund_credit` for automatic refund after provider failure.

## Finance rules

- Analysis is free but rate-limited.
- Generate/revision is paid per output.
- Price is a server-side config, not client-controlled.
- Wallet debit happens only on the server.
- Debit ledger insert and output creation happen in one database transaction.
- Duplicate clicks/retries use an idempotency key and must not debit twice.
- If AI provider fails after debit, append a refund credit ledger entry and mark output failed/refunded.
- Successful output download is free for the owning user.

## Authorization and storage

- Users can only read, update, generate, and download their own AI sessions/outputs.
- Reference images and generated images are stored privately.
- Do not expose permanent public URLs.
- Download uses authenticated backend streaming or short-lived signed URLs.
- Provider API keys are server-only and never logged.

## AI behavior

- Vision model analyzes the uploaded image into structured JSON and a short summary.
- Generation prompt is built from the reference analysis, reference image, user instructions, and disclaimer acceptance.
- One paid generation creates one output image.
- Revisions create new paid output records.
- Keep provider metadata for debugging and support, excluding secrets.

## Mobile-first UX

Page: `/app/ai-invoice-generator`

Steps:
1. Upload reference image
   - file picker and thumbnail preview
   - image-only and size guidance
2. Free analysis
   - button: `Analisa Gratis`
   - show layout/color/field summary
3. Change instructions
   - textarea with short prompt examples
4. Confirm and generate
   - show current generation price
   - disclaimer checkbox
   - button: `Generate & Potong Saldo`
5. Result
   - generated clean image
   - download button
   - revise button returning to instructions and charging again

Error states:
- Insufficient balance: link to top up.
- Analysis limit reached: tell user when limit resets or allow paid generation without another free analysis.
- Provider failure: show failure and refund status.
- Missing ownership/access: deny with a generic not-found or unauthorized message.

## API shape

Minimal endpoints:
- `POST /api/ai-invoice/sessions` — create session and upload/store reference image.
- `POST /api/ai-invoice/sessions/:id/analyze` — run limited free analysis.
- `POST /api/ai-invoice/sessions/:id/generate` — debit wallet and start generation.
- `GET /api/ai-invoice/sessions/:id` — get session and outputs.
- `GET /api/ai-invoice/outputs/:id/download` — authenticated download.

## Tests and verification focus

Business-critical tests:
- Same idempotency key cannot debit twice.
- Insufficient balance prevents output creation/debit.
- Provider failure after debit creates refund credit once.
- User cannot access another user's session/output/download.
- Generation price is read from server config, not request body.

Focused checks after implementation:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx prisma validate`

## Future upgrade path

Later versions can add:
- Conversion from generated image/design analysis to private DokMaker HTML/CSS template.
- Editable form fields mapped from AI-detected invoice fields.
- Optional PDF generation using the existing DokMaker renderer.
- Admin review for user-generated templates if publishing is introduced.
