// Marketplace-ready manifest contract. A theme is publishable only if it
// satisfies every required page + section here.

export const REQUIRED_PAGES = {
  auth:     ["signup", "signin", "forgot_password", "reset_password"],
  home:     ["header", "hero", "usp_strip", "category_grid", "product_grid", "story", "journal_strip", "newsletter", "footer"],
  shop:     ["header", "product_grid", "footer"],
  product:  ["header", "product_detail", "footer"],
  cart:     ["header", "line_items", "cart_summary", "footer"],
  checkout: ["checkout_stepper"],
  journal:  ["header", "journal_list", "footer"],
  about:    ["header", "story", "values", "footer"],
  contact:  ["header", "contact_form", "footer"],
  account:  ["account_panel"],
} as const;

export type PageId = keyof typeof REQUIRED_PAGES;

export interface ValidationResult {
  ok: boolean;
  missing: { page: string; section?: string }[];
}

/**
 * Validate a files_manifest. Sections marked "synthetic" (header, footer)
 * are not required as explicit entries — the renderer always renders them.
 */
const SYNTHETIC = new Set(["header", "footer"]);

export function validateManifest(manifest: any): ValidationResult {
  const missing: ValidationResult["missing"] = [];
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, missing: [{ page: "<root>" }] };
  }
  const pages = manifest.pages ?? {};
  for (const [page, required] of Object.entries(REQUIRED_PAGES)) {
    const p = pages[page];
    if (!p || !Array.isArray(p.sections)) {
      missing.push({ page });
      continue;
    }
    const types = new Set(p.sections.map((s: any) => s?.type).filter(Boolean));
    for (const r of required) {
      if (SYNTHETIC.has(r)) continue;
      if (!types.has(r)) missing.push({ page, section: r });
    }
  }
  return { ok: missing.length === 0, missing };
}
