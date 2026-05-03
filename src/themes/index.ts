import { lazy, Suspense, ComponentType } from 'react';

/**
 * Theme registry. Each theme is a self-contained folder under src/themes/{id}/
 * exporting a default component that accepts { bundle } from get-storefront-bundle.
 *
 * Theme Master Projects copy this whole src/themes/ tree.
 */
export const THEMES = {
  bazaar: lazy(() => import('./bazaar')),
  // future: atelier, pulse, bloom, forge, garden
} as const;

export type ThemeId = keyof typeof THEMES;

export const ThemeRenderer = <T,>({
  themeId,
  bundle,
  fallback,
}: {
  themeId: string;
  bundle: T;
  fallback?: React.ReactNode;
}) => {
  const Theme = (THEMES as Record<string, ComponentType<{ bundle: T }>>)[themeId] ?? THEMES.bazaar;
  return (
    <Suspense fallback={fallback ?? <div className="p-10 text-center text-sm">Loading theme…</div>}>
      <Theme bundle={bundle} />
    </Suspense>
  );
};
