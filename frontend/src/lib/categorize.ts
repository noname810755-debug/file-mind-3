export type Category =
  | "Receipts"
  | "Invoices"
  | "IDs"
  | "Contracts"
  | "Education"
  | "Work"
  | "Personal"
  | "Screenshots"
  | "Financial"
  | "Medical"
  | "Documents";

const RULES: { category: Category; keywords: RegExp }[] = [
  { category: "Invoices", keywords: /\b(invoice|bill|billing|gst|tax invoice|due amount|payable)\b/i },
  { category: "Receipts", keywords: /\b(receipt|paid|payment received|transaction|order id|amount paid|total)\b/i },
  { category: "IDs", keywords: /\b(aadhaar|aadhar|pan card|passport|driving licen[cs]e|voter id|identity|govt id|national id)\b/i },
  { category: "Contracts", keywords: /\b(agreement|contract|terms and conditions|party|hereby|signature|lease|nda)\b/i },
  { category: "Financial", keywords: /\b(bank|statement|account number|ifsc|balance|loan|emi|insurance|policy|premium)\b/i },
  { category: "Medical", keywords: /\b(prescription|diagnosis|patient|hospital|clinic|doctor|medical|report|blood)\b/i },
  { category: "Education", keywords: /\b(marksheet|certificate|degree|university|college|exam|admit card|result|syllabus)\b/i },
  { category: "Work", keywords: /\b(resume|cv|offer letter|salary|payslip|project|meeting|minutes|report)\b/i },
];

export function categorize(name: string, ocr = ""): Category {
  const hay = `${name} ${ocr}`;
  if (/screenshot|screen shot|scr_\d/i.test(name)) return "Screenshots";
  for (const r of RULES) {
    if (r.keywords.test(hay)) return r.category;
  }
  return "Documents";
}

export const ALL_CATEGORIES: Category[] = [
  "Receipts",
  "Invoices",
  "IDs",
  "Contracts",
  "Financial",
  "Medical",
  "Education",
  "Work",
  "Personal",
  "Screenshots",
  "Documents",
];
