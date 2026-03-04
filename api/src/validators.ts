import { z } from "zod";

export const CsvRowSchema = z.object({
  part_number: z.string().min(1),
  description: z.string().optional().default(""),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().positive(),
  lead_time_days: z.coerce.number().int().nonnegative().optional()
});

export type CsvRow = z.infer<typeof CsvRowSchema>;
