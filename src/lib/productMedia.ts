// Shared types and helpers for product/variant media.
// Variant value can be a plain string (legacy) or a structured object
// supporting an optional label, multiple images and a video.

export type VariantValue =
  | string
  | {
      value: string;
      images?: string[];
      videos?: string[];
    };

export interface VariantOption {
  name: string;
  values: VariantValue[];
}

export const getValueText = (v: VariantValue): string =>
  typeof v === 'string' ? v : (v.value || '');

export const getValueImages = (v: VariantValue): string[] =>
  typeof v === 'string' ? [] : (v.images || []);

export const getValueVideos = (v: VariantValue): string[] =>
  typeof v === 'string' ? [] : (v.videos || []);

/** Find a variant value object by display text within an option. */
export const findValue = (
  variant: VariantOption,
  text: string
): VariantValue | undefined =>
  variant.values.find((v) => getValueText(v) === text);

/** Collect images for the first selected variant value that has any. */
export const pickVariantImages = (
  variants: VariantOption[],
  selected: Record<string, string>
): string[] => {
  for (const v of variants) {
    const sel = selected[v.name];
    if (!sel) continue;
    const val = findValue(v, sel);
    const imgs = val ? getValueImages(val) : [];
    if (imgs.length > 0) return imgs;
  }
  return [];
};

export const pickVariantVideos = (
  variants: VariantOption[],
  selected: Record<string, string>
): string[] => {
  for (const v of variants) {
    const sel = selected[v.name];
    if (!sel) continue;
    const val = findValue(v, sel);
    const vids = val ? getValueVideos(val) : [];
    if (vids.length > 0) return vids;
  }
  return [];
};
