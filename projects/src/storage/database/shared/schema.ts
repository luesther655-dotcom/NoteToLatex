import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp, text, varchar, uuid, index } from "drizzle-orm/pg-core";

// System table - DO NOT DELETE
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Conversion history records for each user
export const conversionHistory = pgTable(
  "conversion_history",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    title: varchar("title", { length: 255 }).notNull().default("Untitled"),
    source_image_url: text("source_image_url"),
    markdown_content: text("markdown_content").notNull().default(""),
    latex_content: text("latex_content").notNull().default(""),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("conversion_history_user_id_idx").on(table.user_id),
    index("conversion_history_created_at_idx").on(table.created_at),
  ]
);

export type ConversionHistory = typeof conversionHistory.$inferSelect;
export type InsertConversionHistory = typeof conversionHistory.$inferInsert;
