import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import { PrismaClient, Prisma } from "@prisma/client";
import { parseCsv, sha256, fingerprintRow } from "./importCsv";

const prisma = new PrismaClient();
const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : {}));
app.use(express.json());
app.use(morgan("dev"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.get("/", (_req, res) => res.type("text").send("ERP Quote Ingestor API is running. Try /health"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/rfqs", async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== "string") return res.status(400).json({ error: "title_required" });
  const rfq = await prisma.rfq.create({ data: { title } });
  res.json(rfq);
});

app.get("/rfqs", async (_req, res) => {
  const rfqs = await prisma.rfq.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rfqs);
});

app.post("/imports", upload.single("file"), async (req, res) => {
  try {
    const { rfqId, supplierName, supplierEmail } = req.body;
    if (!rfqId || !supplierName) return res.status(400).json({ error: "rfqId_and_supplierName_required" });
    if (!req.file?.buffer) return res.status(400).json({ error: "file_required" });

    const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) return res.status(404).json({ error: "rfq_not_found" });

    const supplier = await prisma.supplier.upsert({
      where: { name: supplierName },
      update: { email: supplierEmail || undefined },
      create: { name: supplierName, email: supplierEmail || undefined }
    });

    const fileHash = sha256(req.file.buffer);

    const existing = await prisma.importJob.findUnique({
      where: { rfqId_supplierId_fileHash: { rfqId, supplierId: supplier.id, fileHash } },
      include: { errors: true, quote: { include: { lines: true } } }
    });
    if (existing) return res.json({ idempotent: true, job: existing });

    const job = await prisma.importJob.create({
      data: { rfqId, supplierId: supplier.id, filename: req.file.originalname, fileHash, status: "PROCESSING" }
    });

    const { rows, errors } = parseCsv(req.file.buffer);

    const quote = await prisma.quote.create({
      data: { rfqId, supplierId: supplier.id, status: "DRAFT" }
    });

    await prisma.importJob.update({ where: { id: job.id }, data: { quoteId: quote.id } });

    if (errors.length) {
      await prisma.importError.createMany({
        data: errors.map((e: any) => ({
          importJobId: job.id,
          rowNumber: e.rowNumber,
          field: null,
          message: e.message,
          raw: e.raw
        }))
      });
    }

    let successRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const part = await prisma.part.upsert({
          where: { mfgPartNumber: row.part_number },
          update: { description: row.description || undefined },
          create: { mfgPartNumber: row.part_number, description: row.description || undefined }
        });

        const fp = fingerprintRow(row);

        await prisma.quoteLine.create({
          data: {
            quoteId: quote.id,
            partId: part.id,
            quantity: row.quantity,
            unitPrice: new Prisma.Decimal(row.unit_price),
            leadTimeDays: row.lead_time_days ?? null,
            rowFingerprint: fp
          }
        });

        successRows += 1;
      } catch (err: any) {
        const isUnique = err?.code === "P2002";
        await prisma.importError.create({
          data: {
            importJobId: job.id,
            rowNumber,
            field: isUnique ? "rowFingerprint" : null,
            message: isUnique ? "Duplicate line (idempotent row)" : "Insert failed",
            raw: row as any
          }
        });
      }
    }

    const totalRows = rows.length + errors.length;
    const errorRows = (rows.length - successRows) + errors.length;

    const finished = await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", totalRows, successRows, errorRows, finishedAt: new Date() }
    });

    res.json({ idempotent: false, jobId: finished.id, quoteId: quote.id });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "server_error", detail: e?.message });
  }
});

app.get("/import-jobs/:id", async (req, res) => {
  const job = await prisma.importJob.findUnique({
    where: { id: req.params.id },
    include: {
      errors: true,
      quote: {
        include: {
          lines: { include: { part: true } },
          supplier: true,
          rfq: true
        }
      }
    }
  });
  if (!job) return res.status(404).json({ error: "not_found" });
  res.json(job);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on :${port}`));
