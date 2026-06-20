# Generic Document Engine Design

Date: 2026-06-20
Status: Approved for planning

## Goal

Refactor DokMaker from an invoice-only generator into a general document generator based on editable templates. The first document types are:

- `invoice`
- `gocar_receipt`

The GoCar receipt type is based on the provided two-page GoCar/Gojek receipt screenshots (`page-1.png`, `page-2.png`). Users must be able to change the data and generate preview/final PDF from the selected template.

## Product direction

DokMaker becomes a template-based document generator, not only an invoice generator. Existing invoice behavior remains supported as document type `invoice`.

Core monetization remains unchanged:

- Preview is free and watermarked.
- Final PDF download costs Rp10.000 per document version.
- Same-version re-download is free.
- Editing a paid version creates a new unpaid version that must be paid again.

## Recommended architecture

Use a generic document domain:

```text
DocumentTemplate
  id
  documentType
  name
  description
  htmlTemplate
  thumbnailUrl
  isActive

Document
  id
  userId
  templateId
  documentType
  title
  status

DocumentVersion
  id
  documentId
  versionNumber
  content
  contentHash
  status
  paidAt
  storageKey
```

Because the project is still free of production data, we can migrate cleanly from invoice-specific naming to document-specific naming.

## Document type registry

Each document type owns its schema, render mapping, labels, and defaults.

```ts
const documentTypeRegistry = {
  invoice: {
    label: "Invoice",
    schema: invoiceContentSchema,
    buildRenderContext: buildInvoiceRenderContext,
  },
  gocar_receipt: {
    label: "GoCar Receipt",
    schema: gocarReceiptContentSchema,
    buildRenderContext: buildGoCarReceiptRenderContext,
  },
};
```

Benefits:

- One generic payment/download/versioning flow.
- Strong validation per document type.
- Safer template rendering because all user-provided values are escaped.
- Easy to add Grab receipts, hotel receipts, tickets, and other document types later.

## GoCar receipt schema

The schema should match the reference screenshots.

```ts
gocarReceiptContentSchema = {
  service: {
    name: "GoCar",
    orderDate: "Kamis, 11 Juni 2026",
    orderId: "RB-4153088-49607870"
  },
  customer: {
    name: "Bernadus Putra"
  },
  payment: {
    totalPaid: 50000,
    tripFee: 42500,
    appFee: 7500,
    appFeeDiscount: 0,
    method: "GoPay"
  },
  trip: {
    driverName: "UDIN SAPRUDIN",
    vehiclePlate: "B2036UZX",
    vehicleModel: "Toyota Calya",
    distance: "8.8 km",
    duration: "32 menit",
    pickupTime: "11 Juni 2026 jam 15:25",
    pickupName: "Sentral Senayan 1 - 2",
    pickupAddress: "Gelora, Tanahabang, Jakarta Pusat, DKI Jakarta",
    dropoffTime: "11 Juni 2026 jam 15:57",
    dropoffName: "Stasiun Gambir",
    dropoffAddress: "Jl. Medan Merdeka Timur No.1, Gambir, Jakarta Pusat"
  },
  issuer: {
    companyName: "PT GoTo Gojek Tokopedia Tbk",
    npwp: "0745704361064000",
    address: "Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai, Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160"
  }
}
```

## GoCar template layout

The seed template should be a two-page HTML template inspired by the provided screenshots.

### Page 1: receipt

- Green GoCar header.
- Left: `gocar` brand/service label.
- Right: order date and order ID.
- Greeting: `Hai {{customer.name}},`.
- Total paid section with large green amount.
- Payment breakdown:
  - trip fee
  - app fee
  - total payment
  - payment method
- Trip details:
  - driver
  - vehicle plate and model
  - distance and duration
  - pickup time/name/address
  - dropoff time/name/address
- Footer links/legal copy/company address.

### Page 2: tax invoice

- Same green header.
- Title: `Faktur`.
- PPN note.
- App fee, discount, total app fee.
- Issuer company, NPWP, address.

Use CSS page breaks for PDF output:

```css
.page-break {
  page-break-before: always;
}
```

## Rendering rules

- Templates remain platform/admin-owned trusted HTML.
- User content must be escaped before interpolation.
- Unknown placeholders render empty.
- Preview mode adds DokMaker watermark/meta.
- Final PDF mode does not include preview watermark/meta.

## Routes

Target generic routes:

```text
/app/documents
/app/documents/new
/app/documents/[documentId]/preview

/api/documents
/api/documents/[documentId]
/api/documents/[documentId]/download
```

Existing `/app/invoices` and `/api/invoices` routes may be kept temporarily as redirects/compatibility wrappers during transition, but the primary domain should be documents.

## Financial safety invariants

All existing wallet/download rules remain non-negotiable:

- Client-side code must never mutate wallet balance.
- Wallet ledger remains append-only.
- Balance update and ledger insert happen in the same transaction.
- Duplicate final download requests must not debit twice.
- Same document version can only be charged once.
- Final PDFs are stored privately in R2 and served only through authenticated backend routes.
- Re-download uses existing storage artifact and does not regenerate/debit.

## Testing strategy

Required coverage:

- Document type registry validates invoice and GoCar schemas.
- GoCar content schema accepts the reference example.
- GoCar template renders all editable fields.
- User-provided GoCar fields are HTML-escaped.
- GoCar template generates two-page HTML with page break.
- Invoice flow remains working after generic refactor.
- Download flow remains financially safe for all document types.
- Paid same-version re-download is free and uses persisted storage.
- Preview/final differ correctly by watermark/meta.

## Migration note

There is no production data to preserve. A clean Prisma migration/refactor is acceptable. Before any real production deployment, destructive migration risk must be re-evaluated with a backup/rollback plan.
