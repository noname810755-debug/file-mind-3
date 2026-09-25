import type { IconName } from "@/src/icons";

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

export function formatDate(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

const IMAGE = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif"];
const VIDEO = ["mp4", "mov", "mkv", "avi", "webm", "3gp", "m4v", "wmv"];
const AUDIO = ["mp3", "wav", "aac", "ogg", "flac", "m4a", "opus"];
const DOC = ["doc", "docx", "odt", "rtf", "pages"];
const SHEET = ["xls", "xlsx", "csv", "ods"];
const SLIDE = ["ppt", "pptx", "odp", "key"];
const TEXT = ["txt", "md", "json", "xml", "log", "yaml", "yml", "ini"];
const CODE = ["js", "ts", "tsx", "jsx", "py", "java", "html", "css", "c", "cpp", "sh"];
const ARCHIVE = ["zip", "rar", "7z", "tar", "gz", "bz2"];

export type FileKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "doc"
  | "sheet"
  | "slide"
  | "text"
  | "code"
  | "archive"
  | "other";

export function getKind(name: string, isDir = false): FileKind {
  if (isDir) return "folder";
  const e = getExt(name);
  if (e === "pdf") return "pdf";
  if (IMAGE.includes(e)) return "image";
  if (VIDEO.includes(e)) return "video";
  if (AUDIO.includes(e)) return "audio";
  if (DOC.includes(e)) return "doc";
  if (SHEET.includes(e)) return "sheet";
  if (SLIDE.includes(e)) return "slide";
  if (TEXT.includes(e)) return "text";
  if (CODE.includes(e)) return "code";
  if (ARCHIVE.includes(e)) return "archive";
  return "other";
}

export function isImage(name: string) {
  return getKind(name) === "image";
}
export function isPdf(name: string) {
  return getKind(name) === "pdf";
}
export function isVideo(name: string) {
  return getKind(name) === "video";
}
export function isAudio(name: string) {
  return getKind(name) === "audio";
}
export function isTextViewable(name: string) {
  const k = getKind(name);
  return k === "text" || k === "code" || getExt(name) === "csv";
}

export function kindIcon(kind: FileKind): IconName {
  switch (kind) {
    case "folder":
      return "folder";
    case "image":
      return "file-image";
    case "video":
      return "file-video";
    case "audio":
      return "file-music";
    case "pdf":
      return "file-pdf-box";
    case "doc":
      return "file-word-box";
    case "sheet":
      return "file-table-box";
    case "slide":
      return "file-powerpoint-box";
    case "text":
      return "file-document-outline";
    case "code":
      return "file-code";
    case "archive":
      return "folder-zip";
    default:
      return "file-outline";
  }
}

// Color tuple returns a theme-color key name; components map to actual color.
export function kindTint(kind: FileKind): string {
  switch (kind) {
    case "folder":
      return "#FF5E00";
    case "image":
      return "#2E9E5B";
    case "video":
      return "#8B5CF6";
    case "audio":
      return "#EC4899";
    case "pdf":
      return "#E4483C";
    case "doc":
      return "#2563EB";
    case "sheet":
      return "#12855A";
    case "slide":
      return "#D97706";
    case "text":
      return "#64748B";
    case "code":
      return "#0891B2";
    case "archive":
      return "#A16207";
    default:
      return "#8E8E93";
  }
}
