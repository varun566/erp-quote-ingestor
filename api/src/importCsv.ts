import crypto from "crypto";
import { parse } from "csv-parse/sync";
import { CsvRowSchema, CsvRow } from "./validators";

export function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function fingerprintRow(r: CsvRow) {
  const key = [
    r.part_number.trim().toUpperCase(),
    r.quantity,
    r.unit_price.toFixed(2),
    r.lead_time_days ?? ""
  ].join("|");
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function parseCsv(buffer: Buffer): { rows: CsvRow[]; errors: any[] } {
  const raw = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const rows: CsvRow[] = [];
  const errors: any[] = [];

  raw.forEach((obj: any, idx: number) => {
    const rowNumber = idx + 2; // header is row 1
    const result = CsvRowSchema.safeParse(obj);
    if (!result.success) {
      errors.push({
        rowNumber,
        message: "Validation failed",
        issues: result.error.issues,
        raw: obj
      });
      return;
    }
    rows.push(result.data);
  });

  return { rows, errors };
}
