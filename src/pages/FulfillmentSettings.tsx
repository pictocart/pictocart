import { useStore } from '@/hooks/useStore';
import { useFulfillment, type FulfillmentSettings as FS } from '@/hooks/useFulfillment';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Utensils, ShoppingBag, Truck, ExternalLink, MapPin, Navigation, Search, Check, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const FulfillmentSettingsPage = () => {
  const { store, setStore } = useStore();
  const { settings, loading, save, saving } = useFulfillment(store?.id);
  const [draft, setDraft] = useState<FS>(settings);

  // Custom states for local store settings values
  const [takeawayPercent, setTakeawayPercent] = useState<number | ''>(5);
  const [deliveryPerKm, setDeliveryPerKm] = useState<number | ''>(10);
  const [storeLat, setStoreLat] = useState<number | ''>(28.6139);
  const [storeLng, setStoreLng] = useState<number | ''>(77.2090);

  // Meal Category visibility states
  const [showBreakfast, setShowBreakfast] = useState(true);
  const [showLunch, setShowLunch] = useState(true);
  const [showDinner, setShowDinner] = useState(true);
  const [showDrink, setShowDrink] = useState(true);

  // Store Map Picker states
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tempLat, setTempLat] = useState<number | ''>(28.6139);
  const [tempLng, setTempLng] = useState<number | ''>(77.2090);
  const [isDetectingStore, setIsDetectingStore] = useState(false);

  // Address search lookup using Nominatim
  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        toast.error('Search failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error searching address');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    setTempLat(lat);
    setTempLng(lon);
    toast.success('Coordinates updated on preview!');
  };

  const handleDetectStoreLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setIsDetectingStore(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTempLat(position.coords.latitude);
        setTempLng(position.coords.longitude);
        setIsDetectingStore(false);
        toast.success('Current location coordinates detected!');
      },
      (error) => {
        console.error(error);
        setIsDetectingStore(false);
        toast.error('Failed to get location. Please enable location permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleConfirmStoreLocation = () => {
    setStoreLat(tempLat);
    setStoreLng(tempLng);
    setIsMapPickerOpen(false);
    toast.success('Coordinates confirmed & copied to settings!');
  };

  useEffect(() => {
    if (!loading) {
      setDraft(settings);
      const storeSettings = (store?.settings as any) || {};
      
      const parsedTakeaway = storeSettings.fulfillment_takeaway_markup_percent !== undefined
        ? Number(storeSettings.fulfillment_takeaway_markup_percent)
        : 5;
      setTakeawayPercent(isNaN(parsedTakeaway) ? 5 : parsedTakeaway);

      const parsedDelivery = storeSettings.fulfillment_delivery_per_km_charge !== undefined
        ? Number(storeSettings.fulfillment_delivery_per_km_charge)
        : 10;
      setDeliveryPerKm(isNaN(parsedDelivery) ? 10 : parsedDelivery);

      const parsedLat = storeSettings.store_lat !== undefined ? Number(storeSettings.store_lat) : 28.6139;
      setStoreLat(isNaN(parsedLat) ? 28.6139 : parsedLat);

      const parsedLng = storeSettings.store_lng !== undefined ? Number(storeSettings.store_lng) : 77.2090;
      setStoreLng(isNaN(parsedLng) ? 77.2090 : parsedLng);

      const visibleMealTypes = storeSettings.visible_meal_types || { breakfast: true, lunch: true, dinner: true, drink: true };
      setShowBreakfast(visibleMealTypes.breakfast !== false);
      setShowLunch(visibleMealTypes.lunch !== false);
      setShowDinner(visibleMealTypes.dinner !== false);
      setShowDrink(visibleMealTypes.drink !== false);
    }
  }, [loading, settings.store_id, store?.id]);

  if (!store || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (patch: Partial<FS>) => setDraft((d) => ({ ...d, ...patch }));
  
  const onSave = async () => {
    if (!store) return;
    try {
      // 1. Save standard fulfillment settings
      const cleanedDraft = {
        ...draft,
        delivery_radius_km: isNaN(draft.delivery_radius_km) ? 0 : draft.delivery_radius_km,
        delivery_min_order: isNaN(draft.delivery_min_order) ? 0 : draft.delivery_min_order,
        delivery_fee_flat: isNaN(draft.delivery_fee_flat) ? 0 : draft.delivery_fee_flat,
      };
      await save(cleanedDraft);

      // 2. Save store custom settings
      const updatedSettings = {
        ...((store.settings as any) || {}),
        fulfillment_takeaway_markup_percent: takeawayPercent === '' ? 5 : Number(takeawayPercent),
        fulfillment_delivery_per_km_charge: deliveryPerKm === '' ? 10 : Number(deliveryPerKm),
        store_lat: storeLat === '' ? 28.6139 : Number(storeLat),
        store_lng: storeLng === '' ? 77.2090 : Number(storeLng),
        visible_meal_types: {
          breakfast: showBreakfast,
          lunch: showLunch,
          dinner: showDinner,
          drink: showDrink,
        }
      };

      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedSettings })
        .eq('id', store.id);

      if (error) throw error;
      setStore({ ...store, settings: updatedSettings });
      toast.success('Fulfillment settings updated successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-24 md:pb-6 relative">
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur py-4 border-b -mx-4 px-4 md:-mx-6 md:px-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Fulfillment</h1>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            How customers can order from you — Dine-in, Takeaway, or Delivery.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/settings/qr">QR Codes <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
          </Button>
          <Button onClick={onSave} disabled={saving} size="sm">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save settings
          </Button>
        </div>
      </div>

      {/* Dine-in */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><Utensils className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Dine-in</CardTitle>
              <CardDescription>Customers scan a table QR and order from their seat. No sign-up needed.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.dine_in_enabled} onCheckedChange={(v) => update({ dine_in_enabled: v })} />
        </CardHeader>
        {draft.dine_in_enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require table number</Label>
                <p className="text-xs text-muted-foreground">Recommended. QR can encode the table directly.</p>
              </div>
              <Switch checked={draft.dine_in_requires_table} onCheckedChange={(v) => update({ dine_in_requires_table: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-accept incoming orders</Label>
                <p className="text-xs text-muted-foreground">Skip manual confirmation; send straight to the kitchen.</p>
              </div>
              <Switch checked={draft.auto_accept} onCheckedChange={(v) => update({ auto_accept: v })} />
            </div>
            <div>
              <Label>Average prep time (minutes)</Label>
              <Input type="number" min={1} max={120} value={draft.kitchen_prep_minutes}
                onChange={(e) => update({ kitchen_prep_minutes: Number(e.target.value) || 20 })} className="w-32" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Takeaway */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Takeaway / Pickup</CardTitle>
              <CardDescription>Customer orders ahead, pays online or at counter, picks up.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.takeaway_enabled} onCheckedChange={(v) => update({ takeaway_enabled: v })} />
        </CardHeader>
        {draft.takeaway_enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Phone number only (no address)</Label>
                <p className="text-xs text-muted-foreground">Fastest checkout. We call them when ready.</p>
              </div>
              <Switch checked={draft.takeaway_min_phone_only} onCheckedChange={(v) => update({ takeaway_min_phone_only: v })} />
            </div>
            <div>
              <Label>Takeaway Packaging Charge (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={takeawayPercent}
                onChange={(e) => setTakeawayPercent(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-32 mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Extra percentage added to the base price of takeaway orders.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>Standard ship-to-address with Razorpay & COD.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.delivery_enabled} onCheckedChange={(v) => update({ delivery_enabled: v })} />
        </CardHeader>
        {draft.delivery_enabled && (
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Radius (km)</Label>
                <Input type="number" min={0} value={isNaN(draft.delivery_radius_km) ? '' : draft.delivery_radius_km}
                  onChange={(e) => update({ delivery_radius_km: e.target.value === '' ? NaN : Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">0 = unlimited</p>
              </div>
              <div>
                <Label>Min order (₹)</Label>
                <Input type="number" min={0} value={isNaN(draft.delivery_min_order) ? '' : draft.delivery_min_order}
                  onChange={(e) => update({ delivery_min_order: e.target.value === '' ? NaN : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Flat delivery fee (₹)</Label>
                <Input type="number" min={0} value={isNaN(draft.delivery_fee_flat) ? '' : draft.delivery_fee_flat}
                  onChange={(e) => update({ delivery_fee_flat: e.target.value === '' ? NaN : Number(e.target.value) })} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Distance-Based Delivery Charge Settings</h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Delivery fee per KM (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={deliveryPerKm}
                    onChange={(e) => setDeliveryPerKm(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Fee charged per kilometer of distance.</p>
                </div>
                <div>
                  <Label>Store Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={storeLat}
                    onChange={(e) => setStoreLat(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Store Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={storeLng}
                    onChange={(e) => setStoreLng(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTempLat(storeLat || 28.6139);
                      setTempLng(storeLng || 77.2090);
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsMapPickerOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 border-dashed"
                  >
                    <Map className="h-4 w-4 text-emerald-600 shrink-0" />
                    Pick Store Location on Map
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Storefront Meal Categories Visibility
          </CardTitle>
          <CardDescription>
            Choose which meal categories are shown or hidden on your storefront menu page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between border p-3 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Breakfast Category</Label>
                <p className="text-xs text-muted-foreground">Show Breakfast category selector</p>
              </div>
              <Switch checked={showBreakfast} onCheckedChange={setShowBreakfast} />
            </div>

            <div className="flex items-center justify-between border p-3 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Lunch Category</Label>
                <p className="text-xs text-muted-foreground">Show Lunch category selector</p>
              </div>
              <Switch checked={showLunch} onCheckedChange={setShowLunch} />
            </div>

            <div className="flex items-center justify-between border p-3 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Dinner Category</Label>
                <p className="text-xs text-muted-foreground">Show Dinner category selector</p>
              </div>
              <Switch checked={showDinner} onCheckedChange={setShowDinner} />
            </div>

            <div className="flex items-center justify-between border p-3 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Drink / Beverage Category</Label>
                <p className="text-xs text-muted-foreground">Show Drink category selector</p>
              </div>
              <Switch checked={showDrink} onCheckedChange={setShowDrink} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Picker Dialog */}
      <Dialog open={isMapPickerOpen} onOpenChange={setIsMapPickerOpen}>
        <DialogContent className="max-w-3xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600 animate-bounce" />
              Select Store Location
            </DialogTitle>
            <DialogDescription>
              Search your address/locality or use current location to auto-pick the store coordinates.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column: Search & Detect */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-stone-600">Search Address / Locality</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter city, area or street name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searchLoading}
                    size="sm"
                    className="h-9 shrink-0"
                  >
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto bg-stone-50">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2 hover:bg-stone-100 text-[11px] truncate block"
                    >
                      {res.display_name}
                    </button>
                  ))}
                </div>
              )}

              <div className="border rounded-xl p-4 bg-stone-50 space-y-3">
                <h4 className="text-xs font-bold text-stone-700">Selected Coordinates</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-[10px] text-stone-500">Latitude</Label>
                    <Input value={tempLat} readOnly className="h-8 bg-white" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-stone-500">Longitude</Label>
                    <Input value={tempLng} readOnly className="h-8 bg-white" />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleDetectStoreLocation}
                  disabled={isDetectingStore}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 h-9 text-xs"
                >
                  {isDetectingStore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4 text-primary shrink-0" />
                  )}
                  Detect Current Location
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsMapPickerOpen(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmStoreLocation}
                  className="flex-1 text-xs"
                >
                  Confirm Location
                </Button>
              </div>
            </div>

            {/* Right Column: Live Map Preview */}
            <div className="relative aspect-square md:aspect-auto md:h-full w-full rounded-2xl overflow-hidden border bg-stone-100 min-h-[280px]">
              <iframe
                title="Store Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${tempLat},${tempLng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FulfillmentSettingsPage;
