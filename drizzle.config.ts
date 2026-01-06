import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.DATABASE_URL || path.join(process.cwd(), "data", "marketing_agency.db");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: connectionString,
  },
});
