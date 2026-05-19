import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { useStoreMenu, type MenuItem } from '@/hooks/useMenu';
import { useFulfillment, type FulfillmentMode } from '@/hooks/useFulfillment';
import { useCart } from '@/hooks/useCart';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Minus, Flame, Clock, Utensils, ShoppingBag, X, Search, Info } from 'lucide-react';

interface Props {
  /** When true, route is /menu/t/:tableToken and we force dine-in. */
  forceMode?: FulfillmentMode;
  tableFromParam?: string;
}

const MODE_LABEL: Record<FulfillmentMode, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const StorefrontMenu = ({ forceMode, tableFromParam }: Props) => {
  const { slug, tableToken } = useParams<{ slug: string; tableToken?: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { store, loading } = useStorefront(slug || '');
  const { enabledModes, settings } = useFulfillment(store?.id);
  const {
    fulfillmentMode, setFulfillmentMode, tableLabel, setTableLabel,
    items: cartItems, addItem, updateQuantity, totalItems, totalPrice,
  } = useCart(slug || '');
  const { data: sections, isLoading: menuLoading } = useStoreMenu(store?.id, fulfillmentMode);

  const queryTable = search.get('t');
  const resolvedTable = tableFromParam || tableToken || queryTable;

  // Auto-bind table + dine-in mode when arriving via QR
  useEffect(() => {
    if (resolvedTable) {
      setTableLabel(decodeURIComponent(resolvedTable));
    } else if (forceMode && fulfillmentMode !== forceMode) {
      setFulfillmentMode(forceMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTable, forceMode]);

  // Fallback: if current mode isn't enabled, switch to the first enabled
  useEffect(() => {
    if (enabledModes.length > 0 && !enabledModes.includes(fulfillmentMode)) {
      setFulfillmentMode(enabledModes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledModes.join(',')]);

  const qtyOf = (id: string) => cartItems.filter((i) => i.productId === id).reduce((s, i) => s + i.quantity, 0);

  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [detailVariants, setDetailVariants] = useState<Record<string, string>>({});
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState('');

  const openDetail = (it: MenuItem) => {
    setDetail(it);
    setDetailVariants({});
    setDetailQty(1);
    setDetailNotes('');
  };

  const quickAdd = (it: MenuItem) => {
    if ((it.variants && it.variants.length > 0) || (it.description && it.description.length > 0)) {
      openDetail(it);
      return;
    }
    addItem({ productId: it.id, title: it.title, price: it.price, image: it.image_url, available_modes: it.menu_meta.available_modes });
  };

  const addFromDetail = () => {
    if (!detail) return;
    const variantStr = Object.entries(detailVariants).map(([k, v]) => `${k}: ${v}`).join(' / ');
    const key = [variantStr, detailNotes].filter(Boolean).join(' • ') || undefined;
    addItem({
      productId: detail.id,
      title: detail.title,
      price: detail.price,
      image: detail.image_url,
      available_modes: detail.menu_meta.available_modes,
      variant: key,
      notes: detailNotes || undefined,
    }, detailQty);
    setDetail(null);
  };

  const filteredSections = useMemo(() => {
    if (!sections) return [];
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((it) => it.title.toLowerCase().includes(q) || (it.description ?? '').toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, query]);

  const themeColors = useMemo(() => resolveTheme(store?.theme).colors, [store?.theme]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!store) return null;

  if (enabledModes.length === 0) {
    return (
      <StorefrontLayout store={store}>
        <div className="max-w-md mx-auto p-8 text-center">
          <Utensils className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <h1 className="text-xl font-bold mb-2">Menu unavailable</h1>
          <p className="text-sm text-muted-foreground">This store hasn't enabled menu ordering yet.</p>
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32">
        {/* Sticky mode picker */}
        <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center gap-2 overflow-x-auto">
            {enabledModes.map((m) => (
              <button
                key={m}
                onClick={() => setFulfillmentMode(m)}
                disabled={!!resolvedTable && m !== 'dine_in'}
                className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors disabled:opacity-50"
                style={fulfillmentMode === m
                  ? { backgroundColor: themeColors.primary, color: '#fff', borderColor: themeColors.primary }
                  : { borderColor: themeColors.secondary }}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          {tableLabel && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                 style={{ backgroundColor: themeColors.primary + '15', color: themeColors.primary }}>
              <Utensils className="h-3 w-3" /> Table {tableLabel}
              <button onClick={() => setTableLabel(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          )}
          {fulfillmentMode === 'delivery' && settings.delivery_min_order > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Minimum delivery order: ₹{settings.delivery_min_order}</p>
          )}
          <div className="mt-3 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search the menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {menuLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !filteredSections || filteredSections.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {query ? `No items match "${query}".` : `No items available for ${MODE_LABEL[fulfillmentMode]}.`}
          </div>
        ) : (
          filteredSections.map((s) => (
            <section key={s.id} className="pt-6">
              <h2 className="text-lg font-bold mb-3">{s.name}</h2>
              <div className="space-y-3">
                {s.items.map((it) => {
                  const q = qtyOf(it.id);
                  return (
                    <div key={it.id} className="flex gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:shadow-sm transition" onClick={() => openDetail(it)}>
                      {it.image_url && (
                        <img src={it.image_url} alt={it.title} className="h-20 w-20 rounded-md object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {it.menu_meta.diet && (
                            <span className={`inline-block h-3 w-3 rounded-sm border-2 ${
                              it.menu_meta.diet === 'veg' ? 'border-green-600' :
                              it.menu_meta.diet === 'non_veg' ? 'border-red-600' : 'border-yellow-600'
                            }`}>
                              <span className={`block h-1 w-1 m-auto mt-0.5 rounded-full ${
                                it.menu_meta.diet === 'veg' ? 'bg-green-600' :
                                it.menu_meta.diet === 'non_veg' ? 'bg-red-600' : 'bg-yellow-600'
                              }`} />
                            </span>
                          )}
                          <span className="font-medium truncate">{it.title}</span>
                          {!!it.menu_meta.spice_level && (
                            <span className="inline-flex text-orange-500">
                              {Array.from({ length: it.menu_meta.spice_level }).map((_, i) => <Flame key={i} className="h-3 w-3" />)}
                            </span>
                          )}
                          {it.variants.length > 0 && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1 rounded">Options</span>
                          )}
                        </div>
                        {it.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{it.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">₹{it.price.toLocaleString('en-IN')}</span>
                          {!!it.menu_meta.prep_minutes && (
                            <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{it.menu_meta.prep_minutes}m</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                        {q === 0 ? (
                          <button
                            onClick={() => quickAdd(it)}
                            className="px-3 py-1.5 text-sm font-semibold rounded-md"
                            style={{ backgroundColor: themeColors.primary, color: '#fff' }}
                          >
                            <Plus className="h-3.5 w-3.5 inline mr-0.5" />Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 border rounded-md" style={{ borderColor: themeColors.primary }}>
                            <button onClick={() => openDetail(it)} className="px-2 py-1" title="Customize"><Info className="h-3 w-3" /></button>
                            <span className="font-semibold text-sm w-4 text-center">{q}</span>
                            <button onClick={() => quickAdd(it)} className="px-2 py-1"><Plus className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Item detail modal */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:mx-auto sm:rounded-t-2xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{detail.title}</SheetTitle>
              </SheetHeader>
              {detail.image_url && (
                <img src={detail.image_url} alt={detail.title} className="w-full max-h-56 object-cover rounded-lg mt-3" />
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                {detail.menu_meta.diet && (
                  <span className="px-2 py-0.5 rounded-full border capitalize">{detail.menu_meta.diet.replace('_', '-')}</span>
                )}
                {!!detail.menu_meta.spice_level && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-orange-600">
                    {Array.from({ length: detail.menu_meta.spice_level }).map((_, i) => <Flame key={i} className="h-3 w-3" />)} Spicy
                  </span>
                )}
                {!!detail.menu_meta.prep_minutes && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border"><Clock className="h-3 w-3" />{detail.menu_meta.prep_minutes} min</span>
                )}
              </div>
              {detail.description && <p className="text-sm text-muted-foreground mt-3">{detail.description}</p>}
              {detail.menu_meta.allergens && detail.menu_meta.allergens.length > 0 && (
                <p className="text-xs mt-3"><span className="font-semibold">Allergens:</span> {detail.menu_meta.allergens.join(', ')}</p>
              )}

              {detail.variants.length > 0 && (
                <div className="mt-5 space-y-4">
                  {detail.variants.map((v) => (
                    <div key={v.name}>
                      <p className="text-sm font-semibold mb-1.5">{v.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {v.values.map((val) => {
                          const on = detailVariants[v.name] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => setDetailVariants((p) => ({ ...p, [v.name]: val }))}
                              className="px-3 py-1.5 text-sm rounded-md border"
                              style={on ? { backgroundColor: themeColors.primary, color: '#fff', borderColor: themeColors.primary } : {}}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <p className="text-sm font-semibold mb-1.5">Special instructions</p>
                <Textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  placeholder="e.g. less spicy, no onion"
                  rows={2}
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 sticky bottom-0 bg-background pt-4 pb-2">
                <div className="flex items-center gap-2 border rounded-full px-1" style={{ borderColor: themeColors.primary }}>
                  <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5"><Minus className="h-4 w-4" /></button>
                  <span className="font-semibold w-6 text-center">{detailQty}</span>
                  <button onClick={() => setDetailQty((q) => q + 1)} className="px-3 py-1.5"><Plus className="h-4 w-4" /></button>
                </div>
                <button
                  onClick={addFromDetail}
                  className="flex-1 px-4 py-2.5 rounded-full font-semibold text-sm"
                  style={{ backgroundColor: themeColors.primary, color: '#fff' }}
                >
                  Add {detailQty} · ₹{(detail.price * detailQty).toLocaleString('en-IN')}
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Sticky checkout bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <button
            onClick={() => navigate(`/store/${slug}/checkout`)}
            className="pointer-events-auto w-full max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 py-3 rounded-full shadow-lg font-semibold"
            style={{ backgroundColor: themeColors.primary, color: '#fff' }}
          >
            <span className="flex items-center gap-2 text-sm">
              <ShoppingBag className="h-4 w-4" />{totalItems} item{totalItems > 1 ? 's' : ''} · {MODE_LABEL[fulfillmentMode]}
            </span>
            <span>₹{totalPrice.toLocaleString('en-IN')} →</span>
          </button>
        </div>
      )}
    </StorefrontLayout>
  );
};

export default StorefrontMenu;
