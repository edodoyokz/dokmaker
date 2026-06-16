// prisma.config.ts
import { defineConfig } from "prisma/config";

// `prisma generate` must work in CI/fresh checkouts where no live DB exists.
// `migrate`/`db push`/`deploy` always run with a real DATABASE_URL set.
const placeholderUrl =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? placeholderUrl,
    directUrl:
      process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? placeholderUrl,
  },
});
