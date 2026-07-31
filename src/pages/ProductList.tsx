import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Grid3X3, List, Trash2, Package, Copy, MoreVertical, Pencil, Sparkles, Upload, Download, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';

const ProductList = () => {
  const navigate = useNavigate();
  const { products, loading, toggleActive, deleteProduct, bulkDelete, createProduct } = useProducts();
  const { store } = useStore();
  const { limits } = useSubscription();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple robust RFC 4180 CSV parser
  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            cell += '"';
            i++; // skip
          } else {
            inQuotes = false;
          }
        } else {
          cell += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(cell.trim());
          cell = '';
        } else if (c === '\n' || c === '\r') {
          row.push(cell.trim());
          if (row.length > 0 && row.some(x => x !== '')) {
            result.push(row);
          }
          row = [];
          cell = '';
          if (c === '\r' && next === '\n') {
            i++;
          }
        } else {
          cell += c;
        }
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.length > 0 && row.some(x => x !== '')) {
        result.push(row);
      }
    }
    return result;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!store?.id) {
      toast.error("Store information not loaded yet.");
      return;
    }

    setCsvUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("CSV file is empty");
        }

        const parsed = parseCSV(text);
        if (parsed.length <= 1) {
          throw new Error("CSV file must contain a header row and at least one product row");
        }

        const headers = parsed[0].map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
        const rows = parsed.slice(1);

        // Required headers mapping
        const titleIndex = headers.findIndex(h => h === 'title' || h === '*title');
        const shortDescIndex = headers.findIndex(h => h === 'short description' || h === 'short_description');
        const descIndex = headers.findIndex(h => h === 'description');
        const categoryIndex = headers.findIndex(h => h === 'category' || h === '*category');
        const skuIndex = headers.findIndex(h => h === 'sku' || h === '*sku' || h.includes('sku'));
        const mrpIndex = headers.findIndex(h => h === 'mrp' || h === 'compare_at_price');
        const discountIndex = headers.findIndex(h => h.includes('discount'));
        const sellingPriceIndex = headers.findIndex(h => h === 'selling price' || h === 'selling_price' || h === 'price');
        const costPriceIndex = headers.findIndex(h => h === 'cost price' || h === 'cost_price');
        const gstIndex = headers.findIndex(h => h === 'gst %' || h === 'gst' || h === 'tax_rate' || h.includes('gst'));
        const returnableIndex = headers.findIndex(h => h.includes('returnable'));
        const returnDaysIndex = headers.findIndex(h => h.includes('no of days under which return'));
        const exchangeableIndex = headers.findIndex(h => h === 'exchangeable' || h.includes('exchangeable'));
        const exchangeDaysIndex = headers.findIndex(h => h.includes('exchange is allowed'));

        if (titleIndex === -1) {
          throw new Error("CSV must contain a '*TITLE' column");
        }
        if (sellingPriceIndex === -1) {
          throw new Error("CSV must contain a 'Selling Price' column");
        }

        // Check subscription limits
        if (typeof limits.products === 'number' && products.length + rows.length > limits.products) {
          throw new Error(`Uploading ${rows.length} products would exceed your plan limit of ${limits.products} products. Current count is ${products.length}.`);
        }

        const productsToInsert = rows.map((row, idx) => {
          const item: any = {
            store_id: store.id,
            is_active: true,
            is_returnable: true,
            is_exchangeable: true,
            return_window_days: 7,
            exchange_window_days: 7,
            price: 0,
            compare_at_price: null,
            cost_price: 0,
            tax_rate: 0,
          };

          if (titleIndex !== -1 && row[titleIndex]) {
            item.title = row[titleIndex].trim();
          }
          if (shortDescIndex !== -1 && row[shortDescIndex]) {
            item.short_description = row[shortDescIndex].trim() || null;
          }
          if (descIndex !== -1 && row[descIndex]) {
            item.description = row[descIndex].trim() || null;
          }
          if (categoryIndex !== -1 && row[categoryIndex]) {
            item.category = row[categoryIndex].trim() || null;
          }
          if (skuIndex !== -1 && row[skuIndex]) {
            item.sku = row[skuIndex].trim() || null;
          }

          let mrpVal: number | null = null;
          if (mrpIndex !== -1 && row[mrpIndex]) {
            mrpVal = Number(row[mrpIndex].replace(/[^0-9.]/g, '')) || null;
            item.compare_at_price = mrpVal;
          }

          let discountVal = 0;
          if (discountIndex !== -1 && row[discountIndex]) {
            discountVal = Number(row[discountIndex].replace(/[^0-9.]/g, '')) || 0;
          }

          if (sellingPriceIndex !== -1 && row[sellingPriceIndex]) {
            item.price = Number(row[sellingPriceIndex].replace(/[^0-9.]/g, '')) || 0;
          } else if (mrpVal !== null && discountVal > 0) {
            item.price = Math.round(mrpVal * (1 - discountVal / 100));
          }

          if (costPriceIndex !== -1 && row[costPriceIndex]) {
            item.cost_price = Number(row[costPriceIndex].replace(/[^0-9.]/g, '')) || 0;
          }
          if (gstIndex !== -1 && row[gstIndex]) {
            item.tax_rate = Number(row[gstIndex].replace(/[^0-9.]/g, '')) || 0;
          }

          if (returnableIndex !== -1 && row[returnableIndex]) {
            const val = row[returnableIndex].trim().toLowerCase();
            item.is_returnable = (val === 'y' || val === 'yes' || val === 'true' || val === '1');
          }
          if (returnDaysIndex !== -1 && row[returnDaysIndex]) {
            item.return_window_days = parseInt(row[returnDaysIndex].replace(/[^0-9]/g, ''), 10) || 7;
          }

          if (exchangeableIndex !== -1 && row[exchangeableIndex]) {
            const val = row[exchangeableIndex].trim().toLowerCase();
            item.is_exchangeable = (val === 'y' || val === 'yes' || val === 'true' || val === '1');
          }
          if (exchangeDaysIndex !== -1 && row[exchangeDaysIndex]) {
            item.exchange_window_days = parseInt(row[exchangeDaysIndex].replace(/[^0-9]/g, ''), 10) || 7;
          }

          if (!item.title) {
            throw new Error(`Row ${idx + 2}: Title is required`);
          }
          if (isNaN(item.price) || item.price <= 0) {
            throw new Error(`Row ${idx + 2}: Selling Price must be a valid positive number`);
          }
          if (!item.sku) {
            item.sku = 'SKU-' + Math.random().toString(36).substring(2, 11).toUpperCase();
          }

          return item;
        });

        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) throw error;

        toast.success(`Successfully uploaded ${productsToInsert.length} products!`);
        queryClient.invalidateQueries({ queryKey: ['products', store.id] });
        setBulkDialogOpen(false);
      } catch (err: any) {
        console.error("Bulk upload error:", err);
        toast.error(err.message || "Failed to process CSV file");
      } finally {
        setCsvUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read CSV file");
      setCsvUploading(false);
    };

    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const headers = "*TITLE,SHORT DESCRIPTION,DESCRIPTION,*CATEGORY,*SKU (unique item codes),MRP,Discount %,Selling Price,Cost Price,GST %,Returnable(Y/N),No of days under which Return is allowed,Exchangeable,number of days Exchange is allowed";
    const row1 = '"Aero Smartwatch Pro","Telemetry logger","Heart monitoring & custom dials","Electronics","AERO-SMART-PRO",4999,50,2499,1200,18,"Y",7,"Y",7';
    const row2 = '"Smart Digital Microwave","Auto cooking","Multi-stage auto cooking","Appliances","SMART-MICROWAVE",9999,35,6499,3500,12,"Y",7,"Y",7';
    const row3 = '"Water Bottle","Insulated bottle","Stainless steel insulated water bottle","Accessories","BOTTLE-001",999,20,799,300,18,"N",0,"N",0';
    const csvContent = headers + "\n" + row1 + "\n" + row2 + "\n" + row3 + "\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "products_sample.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== 'all' && p.category !== category) return false;
      return true;
    });
  }, [products, search, category]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((p) => p.id)) : new Set());
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    bulkDelete.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) });
  };

  const handleDuplicate = async (p: typeof products[number]) => {
    try {
      await createProduct.mutateAsync({
        title: `${p.title} (Copy)`,
        description: p.description,
        short_description: p.short_description,
        price: p.price,
        compare_at_price: p.compare_at_price,
        category: p.category,
        sku: null,
        tags: p.tags,
        images: [],
        variants: p.variants as any,
        inventory_count: 0,
        cost_price: p.cost_price,
        tax_rate: (p as any).tax_rate,
        is_active: false,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        ai_generated_data: p.ai_generated_data as any,
      });
      toast.success('Product duplicated as draft');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to duplicate');
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>, src: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: rect.right + 12, y: rect.top });
    setZoomImg(src);
  };

  const handleImageMouseLeave = () => setZoomImg(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Bulk Upload
          </Button>
          <Button data-tour="products-new" onClick={() => navigate('/products/new')}>
            <Plus className="mr-1 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div data-tour="products-search" className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('list')}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('grid')}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-accent p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !search && category === 'all' ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Package className="h-7 w-7 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No products yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Upload a product image and let AI generate all the details for you.
          </p>
          <Button className="mt-4" onClick={() => navigate('/products/new')}>
            <Plus className="mr-1 h-4 w-4" /> Add Your First Product
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No products match your filters.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selected.has(product.id)}
              onSelect={(c) => toggleSelect(product.id, c as boolean)}
              onToggleActive={(active) => toggleActive.mutate({ id: product.id, is_active: active })}
              onDelete={() => deleteProduct.mutate(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(product.id)}
                      onCheckedChange={(c) => toggleSelect(product.id, c as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted relative cursor-zoom-in"
                        onMouseMove={product.images?.[0] ? (e) => handleImageMouseMove(e, product.images[0]) : undefined}
                        onMouseLeave={product.images?.[0] ? handleImageMouseLeave : undefined}
                      >
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <span
                        className="cursor-pointer font-medium hover:text-primary transition-colors line-clamp-1"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        {product.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category || '—'}</TableCell>
                  <TableCell className="text-right font-medium">₹{product.price}</TableCell>
                  <TableCell className="text-center">{product.inventory_count ?? 0}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={product.is_active ?? false}
                      onCheckedChange={(active) => toggleActive.mutate({ id: product.id, is_active: active })}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                          <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/reviews?product_id=${product.id}`)}>
                          <Sparkles className="mr-2 h-3.5 w-3.5 text-violet-600" /> AI Reviews
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteProduct.mutate(product.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Hover zoom overlay */}
      {zoomImg && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl overflow-hidden shadow-2xl border border-border bg-white"
          style={{ left: zoomPos.x, top: zoomPos.y, width: 220, height: 220 }}
        >
          <img src={zoomImg} alt="zoom preview" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Products</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing multiple products to import them in bulk.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-slate-700">Supported columns in CSV:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><span className="font-semibold text-slate-700">*TITLE</span> (required) — e.g. "Running Shoes"</li>
                <li><span className="font-semibold text-slate-700">Selling Price</span> (required) — numeric, e.g. 1299</li>
                <li><span className="font-semibold text-slate-700">MRP</span> — original retail price, e.g. 1999</li>
                <li><span className="font-semibold text-slate-700">Discount %</span> — numeric discount percentage, e.g. 10</li>
                <li><span className="font-semibold text-slate-700">DESCRIPTION</span> — product details</li>
                <li><span className="font-semibold text-slate-700">SHORT DESCRIPTION</span> — short summary</li>
                <li><span className="font-semibold text-slate-700">*CATEGORY</span> — product category</li>
                <li><span className="font-semibold text-slate-700">*SKU (unique item codes)</span> — unique identifier</li>
                <li><span className="font-semibold text-slate-700">Cost Price</span> — vendor purchase price</li>
                <li><span className="font-semibold text-slate-700">GST %</span> — tax rate percentage, e.g. 18</li>
                <li><span className="font-semibold text-slate-700">Returnable(Y/N)</span> — Y or N</li>
                <li><span className="font-semibold text-slate-700">No of days under which Return is allowed</span> — e.g. 7</li>
                <li><span className="font-semibold text-slate-700">Exchangeable</span> — Y or N</li>
                <li><span className="font-semibold text-slate-700">number of days Exchange is allowed</span> — e.g. 7</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Step 1: Download Template</span>
              <Button type="button" variant="outline" size="sm" onClick={downloadSampleCSV} className="gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Download Sample CSV
              </Button>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="text-sm font-medium text-slate-700 block">Step 2: Upload CSV File</span>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleCsvUpload}
                disabled={csvUploading}
                className="hidden"
                id="csv-file-upload"
              />
              <Label
                htmlFor="csv-file-upload"
                className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:bg-slate-55 transition-colors ${csvUploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                {csvUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <span className="text-sm font-semibold text-slate-700">Importing products...</span>
                    <span className="text-xs text-muted-foreground mt-1">Parsing CSV and inserting into database</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</span>
                    <span className="text-xs text-muted-foreground mt-1">CSV files only, up to 10MB</span>
                  </>
                )}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)} disabled={csvUploading}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductList;
