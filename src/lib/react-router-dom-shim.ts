// @ts-nocheck
import React from 'react';
import * as rrd from "../../node_modules/react-router-dom/dist/index.js";

export * from "../../node_modules/react-router-dom/dist/index.js";

// Helper to strip /store/:slug from a path when on a custom domain
function cleanPath(to: any) {
  const hostStoreSlug = (window as any).__hostStoreSlug;
  if (!hostStoreSlug) return to;

  if (typeof to === 'string') {
    const prefix = `/store/${hostStoreSlug}`;
    if (to.startsWith(prefix)) {
      const rest = to.substring(prefix.length);
      return rest === "" ? "/" : rest;
    }
  } else if (to && typeof to === 'object' && typeof to.pathname === 'string') {
    const prefix = `/store/${hostStoreSlug}`;
    if (to.pathname.startsWith(prefix)) {
      const rest = to.pathname.substring(prefix.length);
      return {
        ...to,
        pathname: rest === "" ? "/" : rest
      };
    }
  }
  return to;
}

export function useParams() {
  const params = rrd.useParams();
  if (!params.slug && (window as any).__hostStoreSlug) {
    return { ...params, slug: (window as any).__hostStoreSlug };
  }
  return params;
}

// Wrapper for useNavigate
export function useNavigate() {
  const originalNavigate = rrd.useNavigate();
  return React.useCallback((to: any, options: any) => {
    if (typeof to === 'number') {
      return originalNavigate(to);
    }
    return originalNavigate(cleanPath(to), options);
  }, [originalNavigate]);
}

// Wrapper for Link
export const Link = React.forwardRef((props: any, ref: any) => {
  const cleanedTo = cleanPath(props.to);
  return React.createElement(rrd.Link, { ...props, to: cleanedTo, ref });
});
Link.displayName = 'Link';

// Wrapper for NavLink
export const NavLink = React.forwardRef((props: any, ref: any) => {
  const cleanedTo = cleanPath(props.to);
  return React.createElement(rrd.NavLink, { ...props, to: cleanedTo, ref });
});
NavLink.displayName = 'NavLink';
