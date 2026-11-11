import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "obra-documents";
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PDF_PAGES = 60;
const MAX_TEXT_CHARS = 60_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

/** Bloco de documento (PDF) aceito pela API dentro de um tool_result; o tipo do SDK instalado ainda não o lista. */
interface PdfBlock {
  type: "document";
  title: string;
  source: { type: "base64"; media_type: "application/pdf"; data: string };
}

export type DocumentToolContent =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | PdfBlock>;

export const READ_DOCUMENT_TOOL = {
  name: "read_document",
  description:
    "Abre e lê um arquivo anexado no app (aba Documentos ou orçamentos de um fornecedor), listado em 'Documentos anexados no app'. " +
    "Lê PDF, foto/imagem e texto. Use sempre que o pedido depender do conteúdo de um arquivo: contrato, orçamento, " +
    "comprovante, nota, planta, memorial ('o que diz o contrato', 'quanto deu o orçamento da X', 'lança esse comprovante'). " +
    "Um arquivo por chamada. Depois de ler, responda ou use as outras ferramentas com os dados do arquivo.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description:
          "Nome do arquivo como aparece na lista (ou parte dele), ou o nome do fornecedor pra orçamentos.",
      },
    },
    required: ["name"],
  },
};

interface DocRow {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
  where: string;
}

async function loadDocs(householdId: string, moduleId: string): Promise<DocRow[]> {
  const admin = createSupabaseAdmin();
  const [{ data: docs }, { data: folders }, { data: budgets }, { data: suppliers }] =
    await Promise.all([
      admin
        .from("obra_documents")
        .select("id, name, file_url, file_type, size_bytes, created_at, folder_id")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false }),
      admin.from("obra_folders").select("id, name").eq("module_id", moduleId),
      admin
        .from("supplier_budget_files")
        .select("id, name, file_url, file_type, size_bytes, created_at, supplier_id")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false }),
      admin.from("suppliers").select("id, name").eq("household_id", householdId),
    ]);
  const folderName = new Map((folders ?? []).map((f) => [f.id, f.name]));
  const supplierName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  return [
    ...(docs ?? []).map((d) => ({
      ...d,
      where:
        d.folder_id && folderName.get(d.folder_id)
          ? `Documentos / ${folderName.get(d.folder_id)}`
          : "Documentos",
    })),
    ...(budgets ?? []).map((b) => ({
      ...b,
      where: `Orçamento de ${supplierName.get(b.supplier_id) ?? "fornecedor"}`,
    })),
  ];
}

function kindOf(d: Pick<DocRow, "name" | "file_type">): "pdf" | "image" | "text" | "other" {
  const type = (d.file_type ?? "").toLowerCase();
  const ext = d.name.toLowerCase().split(".").pop() ?? "";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "image";
  if (type.startsWith("text/") || ["txt", "csv", "md", "json"].includes(ext)) return "text";
  return "other";
}

/** Linhas da seção de documentos no contexto da IA. */
export async function documentContextLines(
  householdId: string,
  moduleId: string,
): Promise<string[]> {
  const docs = await loadDocs(householdId, moduleId);
  if (docs.length === 0) return [];
  const lines = ["", `## Documentos anexados no app (${docs.length}; use read_document pra abrir)`];
  for (const d of docs.slice(0, 60)) {
    const k = kindOf(d);
    const tag = k === "other" ? " | formato que não consigo ler" : "";
    lines.push(`- ${d.name} | ${d.where} | ${d.created_at.slice(0, 10)}${tag}`);
  }
  if (docs.length > 60) lines.push(`- e mais ${docs.length - 60} (peça o nome exato)`);
  return lines;
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function storagePath(fileUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = fileUrl.indexOf(marker);
  return i >= 0 ? decodeURIComponent(fileUrl.slice(i + marker.length).split("?")[0]!) : null;
}

function imageType(d: DocRow): ImageType {
  const t = (d.file_type ?? "").toLowerCase();
  const found = IMAGE_TYPES.find((x) => x === t);
  if (found) return found;
  const ext = d.name.toLowerCase().split(".").pop();
  return ext === "png"
    ? "image/png"
    : ext === "gif"
      ? "image/gif"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";
}

/** Conteúdo de um arquivo da obra pronto pra ir num tool_result (PDF, imagem ou texto). */
export async function readDocument(
  householdId: string,
  moduleId: string,
  args: { name?: string },
): Promise<DocumentToolContent> {
  const wanted = norm(args.name ?? "");
  if (!wanted) return "Diga qual arquivo (nome como aparece na lista).";
  const docs = await loadDocs(householdId, moduleId);
  const exact = docs.filter((d) => norm(d.name) === wanted);
  const matches =
    exact.length > 0
      ? exact
      : docs.filter((d) => norm(d.name).includes(wanted) || norm(d.where).includes(wanted));
  if (matches.length === 0)
    return `Não achei arquivo com "${args.name}". Arquivos no app: ${
      docs
        .slice(0, 30)
        .map((d) => d.name)
        .join(", ") || "nenhum"
    }.`;
  if (matches.length > 1) {
    return `Mais de um arquivo bate com "${args.name}": ${matches
      .slice(0, 15)
      .map((d) => `${d.name} (${d.where})`)
      .join("; ")}. Pergunte qual.`;
  }

  const doc = matches[0]!;
  const kind = kindOf(doc);
  if (kind === "other")
    return `"${doc.name}" é de um formato que não consigo ler (só PDF, imagem e texto). Peça pro usuário mandar em PDF.`;

  const path = storagePath(doc.file_url);
  if (!path || !path.startsWith(`${householdId}/`)) return `Não consegui abrir "${doc.name}".`;
  const { data: blob, error } = await createSupabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !blob) return `Não consegui baixar "${doc.name}". Tente de novo.`;
  const buf = Buffer.from(await blob.arrayBuffer());
  const header = `Arquivo "${doc.name}" (${doc.where}, enviado em ${doc.created_at.slice(0, 10)}):`;

  if (kind === "text") {
    const text = buf.toString("utf-8");
    const cut = text.length > MAX_TEXT_CHARS;
    return `${header}\n${text.slice(0, MAX_TEXT_CHARS)}${cut ? "\n[arquivo cortado: só o começo foi lido]" : ""}`;
  }
  if (kind === "image") {
    if (buf.length > MAX_IMAGE_BYTES)
      return `A imagem "${doc.name}" é grande demais pra eu ler (mais de 4 MB).`;
    return [
      { type: "text", text: header },
      {
        type: "image",
        source: { type: "base64", media_type: imageType(doc), data: buf.toString("base64") },
      },
    ];
  }
  if (buf.length > MAX_PDF_BYTES)
    return `O PDF "${doc.name}" é grande demais pra eu ler (mais de 10 MB).`;
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  if (pages > MAX_PDF_PAGES)
    return `O PDF "${doc.name}" tem ${pages} páginas, passa do que consigo ler de uma vez (${MAX_PDF_PAGES}).`;
  return [
    { type: "text", text: header },
    {
      type: "document",
      title: doc.name,
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
    },
  ];
}
