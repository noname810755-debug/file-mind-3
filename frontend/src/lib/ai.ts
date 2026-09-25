import { getMeta, searchOcr } from "./db";
import { listDir, ROOT, type FileEntry } from "./fs";
import { getKind, type FileKind } from "./format";

export async function walkAll(dir: string = ROOT, depth = 0): Promise<FileEntry[]> {
  if (depth > 8) return [];
  let entries: FileEntry[] = [];
  try {
    entries = await listDir(dir);
  } catch {
    return [];
  }
  const out: FileEntry[] = [];
  for (const e of entries) {
    if (e.isDir) {
      out.push(...(await walkAll(e.uri, depth + 1)));
    } else {
      out.push(e);
    }
  }
  return out;
}

type SearchFilters = {
  term: string;
  kinds: FileKind[];
  year?: number;
  sizeMin?: number;
  large?: boolean;
};

const KIND_WORDS: { words: RegExp; kind: FileKind }[] = [
  { words: /\b(pdf|pdfs)\b/i, kind: "pdf" },
  { words: /\b(image|images|photo|photos|picture|pictures|jpg|png)\b/i, kind: "image" },
  { words: /\b(video|videos|movie|clip)\b/i, kind: "video" },
  { words: /\b(audio|music|song|mp3)\b/i, kind: "audio" },
  { words: /\b(document|documents|doc|word)\b/i, kind: "doc" },
];

export function parseFilters(query: string): SearchFilters {
  const kinds: FileKind[] = [];
  for (const k of KIND_WORDS) if (k.words.test(query)) kinds.push(k.kind);
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  const large = /\b(large|big|huge|heavy)\b/i.test(query);
  // strip stopwords to get the real term
  const term = query
    .replace(/\b(find|show|search|my|the|a|an|all|me|documents?|files?|pdfs?|images?|photos?|videos?|from|containing|mentioning|with|large|big)\b/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .trim();
  return {
    term,
    kinds,
    year: yearMatch ? parseInt(yearMatch[0], 10) : undefined,
    large,
  };
}

export async function searchFiles(query: string): Promise<FileEntry[]> {
  const f = parseFilters(query);
  const all = await walkAll();
  // ocr matches from index
  let ocrPaths = new Set<string>();
  if (f.term) {
    try {
      const rows = await searchOcr(f.term);
      rows.forEach((r) => ocrPaths.add(r.path));
    } catch {}
  }
  let result = all.filter((e) => {
    if (f.kinds.length && !f.kinds.includes(e.kind)) return false;
    if (f.year) {
      const y = new Date(e.modified).getFullYear();
      if (y !== f.year) return false;
    }
    if (f.term) {
      const nameMatch = e.name.toLowerCase().includes(f.term.toLowerCase());
      if (!nameMatch && !ocrPaths.has(e.uri)) return false;
    }
    return true;
  });
  if (f.large) result.sort((a, b) => b.size - a.size);
  else result.sort((a, b) => b.modified - a.modified);
  return result.slice(0, 200);
}

export type Intent =
  | "search"
  | "summarize"
  | "extract"
  | "merge"
  | "images_to_pdf"
  | "duplicates"
  | "organize"
  | "compress"
  | "translate"
  | "ocr"
  | "unknown";

export function parseIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(summari[sz]e|summary|tl;?dr)\b/.test(t)) return "summarize";
  if (/\b(translate|hindi|convert language)\b/.test(t)) return "translate";
  if (/\b(extract|vendor|amount|date|entities|invoice number)\b/.test(t)) return "extract";
  if (/\b(merge|combine|join)\b/.test(t)) return "merge";
  if (/\b(image[s]? (in)?to pdf|create (a )?pdf from|photos to pdf)\b/.test(t)) return "images_to_pdf";
  if (/\b(duplicate|duplicates|same file)\b/.test(t)) return "duplicates";
  if (/\b(organi[sz]e|sort into|categori[sz]e|clean ?up)\b/.test(t)) return "organize";
  if (/\b(compress|reduce size|shrink|optimi[sz]e)\b/.test(t)) return "compress";
  if (/\b(ocr|searchable|read text|extract text|scan text)\b/.test(t)) return "ocr";
  if (/\b(find|show|search|where|list|get)\b/.test(t)) return "search";
  return "unknown";
}

export type Entities = {
  dates: string[];
  amounts: string[];
  emails: string[];
  phones: string[];
  ids: string[];
};

export function extractEntities(text: string): Entities {
  const dates = [
    ...new Set(
      (text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/g) || []).concat(
        text.match(/\b(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/gi) || [],
      ),
    ),
  ].slice(0, 20);
  const amounts = [
    ...new Set(text.match(/(₹|rs\.?|inr|\$|usd)\s?[\d,]+(\.\d{1,2})?/gi) || []),
  ].slice(0, 20);
  const emails = [...new Set(text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [])].slice(0, 20);
  const phones = [...new Set(text.match(/\b(\+?\d[\d\s-]{8,13}\d)\b/g) || [])].slice(0, 20);
  const ids = [...new Set(text.match(/\b(\d{4}\s?\d{4}\s?\d{4}|[A-Z]{5}\d{4}[A-Z])\b/g) || [])].slice(0, 20);
  return { dates, amounts, emails, phones, ids };
}

export function summarizeText(text: string, maxSentences = 5): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "No readable text found in this document.";
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  if (sentences.length <= maxSentences) return clean;
  // word frequency scoring
  const freq: Record<string, number> = {};
  const stop = new Set(
    "the a an and or of to in on for is are was were be with this that as at by from it its it's".split(" "),
  );
  clean
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .split(/\s+/)
    .forEach((w) => {
      if (w.length > 2 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().split(/\s+/);
    const score = words.reduce((acc, w) => acc + (freq[w.replace(/[^a-z0-9\u0900-\u097F]/g, "")] || 0), 0) / (words.length || 1);
    return { s: s.trim(), i, score };
  });
  const top = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i);
  return top.map((t) => t.s).join(" ");
}

export { getKind, getMeta };
