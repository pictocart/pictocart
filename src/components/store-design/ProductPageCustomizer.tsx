import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { getPageSections, getDefaultProductSections, buildResolvedStorefrontManifest } from '@/lib/storefrontManifest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd';
import {
  Eye,
  Settings,
  GripVertical,
  Plus,
  Trash2,
  Image,
  Info,
  Star,
  Package,
  Clock,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const SECTION_TYPES = {
  product_images: {
    name: 'Product Images',
    description: 'Product photo gallery with thumbnails and zoom',
    icon: Image,
    defaultProps: {
      showThumbnails: true,
      showZoom: true,
      galleryLayout: 'horizontal'
    }
  },
  product_info: {
    name: 'Product Information',
    description: 'Price, description, variants, and add to cart',
    icon: Info,
    defaultProps: {
      showPrice: true,
      showDescription: true,
      showVariants: true,
      showQuantity: true,
      showAddToCart: true,
      showWishlist: true,
      showShare: true
    }
  },
  product_reviews: {
    name: 'Customer Reviews',
    description: 'Product ratings and review comments',
    icon: Star,
    defaultProps: {
      showRating: true,
      showReviewForm: true,
      showReviewStats: true
    }
  },
  related_products: {
    name: 'Related Products',
    description: 'Show similar products from same category',
    icon: Package,
    defaultProps: {
      title: 'Related Products',
      count: 8,
      layout: 'grid'
    }
  },
  recently_viewed: {
    name: 'Recently Viewed',
    description: 'Show customer\'s browsing history',
    icon: Clock,
    defaultProps: {
      title: 'Recently Viewed',
      count: 6
    }
  }
};

const STYLE_OPTIONS = {
  product_images: ['gallery', 'carousel', 'grid', 'stack'],
  product_info: ['detailed', 'compact', 'sidebar'],
  product_reviews: ['tabbed', 'accordion', 'inline'],
  related_products: ['carousel', 'grid', 'list'],
  recently_viewed: ['horizontal_scroll', 'grid', 'compact']
};

interface ProductPageCustomizerProps {
  onPreview?: (sections: any[]) => void;
}

const ProductPageCustomizer: React.FC<ProductPageCustomizerProps> = ({ onPreview }) => {
  const { store } = useStore();
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (store) {
      loadProductSections();
    }
  }, [store]);

  const loadProductSections = async () => {
    if (!store) return;
    
    try {
      setIsLoading(true);
      const currentSections = getPageSections(store, 'product');
      
      if (currentSections.length > 0) {
        setSections(currentSections as any[]);
      } else {
        // Use default sections if none configured
        const defaultSections = getDefaultProductSections();
        setSections(defaultSections as any[]);
      }
    } catch (error) {
      console.error('Error loading product sections:', error);
      toast.error('Failed to load product page configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSections = async () => {
    if (!store || !hasChanges) return;

    try {
      setIsSaving(true);
      
      // Get current store settings
      const currentConfig = store.settings || {};
      
      // Update product sections in config
      const updatedConfig = {
        ...currentConfig,
        product_sections: sections
      };

      // Update store settings
      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedConfig })
        .eq('id', store.id);

      if (error) throw error;

      // Also update resolved_storefront_manifest for immediate effect
      const resolvedManifest = await buildResolvedStorefrontManifest(store, updatedConfig);
      
      await supabase
        .from('stores')
        .update({ resolved_storefront_manifest: resolvedManifest })
        .eq('id', store.id);

      toast.success('Product page configuration saved successfully!');
      setHasChanges(false);
      
    } catch (error) {
      console.error('Error saving product sections:', error);
      toast.error('Failed to save product page configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultSections = getDefaultProductSections();
    setSections(defaultSections as any[]);
    setHasChanges(true);
    toast.success('Reset to default configuration');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newSections = Array.from(sections);
    const [reorderedItem] = newSections.splice(result.source.index, 1);
    newSections.splice(result.destination.index, 0, reorderedItem);

    setSections(newSections);
    setHasChanges(true);
  };
  const addSection = (type: string) => {
    const sectionType = SECTION_TYPES[type as keyof typeof SECTION_TYPES];
    if (!sectionType) return;

    const newSection = {
      type,
      style: STYLE_OPTIONS[type as keyof typeof STYLE_OPTIONS]?.[0] || 'default',
      enabled: true,
      props: { ...sectionType.defaultProps }
    };

    setSections([...sections, newSection]);
    setHasChanges(true);
    toast.success(`Added ${sectionType.name} section`);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    setHasChanges(true);
    toast.success('Section removed');
  };

  const updateSection = (index: number, updates: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    setSections(newSections);
    setHasChanges(true);
  };

  const updateSectionProp = (index: number, propKey: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = {
      ...newSections[index],
      props: {
        ...newSections[index].props,
        [propKey]: value
      }
    };
    setSections(newSections);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading product page configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Page Customizer</h2>
          <p className="text-muted-foreground">
            Configure which sections appear on your product detail pages and how they look
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          {onPreview && (
            <Button
              variant="outline"
              onClick={() => onPreview(sections)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          )}
          <Button
            onClick={saveSections}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Library */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Sections</h3>
          <div className="space-y-2">
            {Object.entries(SECTION_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              const alreadyAdded = sections.some(s => s.type === type);
              
              return (
                <Card key={type} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">{config.name}</h4>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addSection(type)}
                      disabled={alreadyAdded && ['product_images', 'product_info'].includes(type)}
                      className="shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {alreadyAdded && ['product_images', 'product_info'].includes(type) && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Already Added (Core Section)
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Configured Sections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Page Sections</h3>
            <Badge variant="outline">{sections.length} sections</Badge>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {sections.map((section, index) => {
                    const sectionConfig = SECTION_TYPES[section.type as keyof typeof SECTION_TYPES];
                    const Icon = sectionConfig?.icon || Settings;
                    const styleOptions = STYLE_OPTIONS[section.type as keyof typeof STYLE_OPTIONS] || [];

                    return (
                      <Draggable key={`${section.type}-${index}`} draggableId={`${section.type}-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                  </div>
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <CardTitle className="text-base">
                                      {sectionConfig?.name || section.type}
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                      {sectionConfig?.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={section.enabled !== false}
                                    onCheckedChange={(enabled) => updateSection(index, { enabled })}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeSection(index)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            
                            {section.enabled !== false && (
                              <CardContent className="pt-0 space-y-4">
                                {/* Style Selection */}
                                {styleOptions.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Style</Label>
                                    <Select
                                      value={section.style}
                                      onValueChange={(style) => updateSection(index, { style })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {styleOptions.map((style) => (
                                          <SelectItem key={style} value={style}>
                                            {style.charAt(0).toUpperCase() + style.slice(1).replace('_', ' ')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Section-specific Props */}
                                {section.type === 'related_products' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm">Title</Label>
                                      <Input
                                        value={section.props?.title || ''}
                                        onChange={(e) => updateSectionProp(index, 'title', e.target.value)}
                                        placeholder="Related Products"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm">Count</Label>
                                      <Input
                                        type="number"
                                        value={section.props?.count || 8}
                                        onChange={(e) => updateSectionProp(index, 'count', parseInt(e.target.value))}
                                        min="1"
                                        max="20"
                                      />
                                    </div>
                                  </div>
                                )}

                                {section.type === 'recently_viewed' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm">Title</Label>
                                      <Input
                                        value={section.props?.title || ''}
                                        onChange={(e) => updateSectionProp(index, 'title', e.target.value)}
                                        placeholder="Recently Viewed"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm">Count</Label>
                                      <Input
                                        type="number"
                                        value={section.props?.count || 6}
                                        onChange={(e) => updateSectionProp(index, 'count', parseInt(e.target.value))}
                                        min="1"
                                        max="12"
                                      />
                                    </div>
                                  </div>
                                )}

                                {section.type === 'product_images' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={section.props?.showThumbnails !== false}
                                        onCheckedChange={(checked) => updateSectionProp(index, 'showThumbnails', checked)}
                                      />
                                      <Label className="text-sm">Show Thumbnails</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={section.props?.showZoom !== false}
                                        onCheckedChange={(checked) => updateSectionProp(index, 'showZoom', checked)}
                                      />
                                      <Label className="text-sm">Enable Zoom</Label>
                                    </div>
                                  </div>
                                )}

                                {section.type === 'product_info' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    {[
                                      { key: 'showPrice', label: 'Show Price' },
                                      { key: 'showDescription', label: 'Show Description' },
                                      { key: 'showVariants', label: 'Show Variants' },
                                      { key: 'showQuantity', label: 'Show Quantity Selector' },
                                      { key: 'showAddToCart', label: 'Show Add to Cart' },
                                      { key: 'showWishlist', label: 'Show Wishlist Button' },
                                      { key: 'showShare', label: 'Show Share Button' },
                                      { key: 'showRating', label: 'Show Rating' }
                                    ].map(({ key, label }) => (
                                      <div key={key} className="flex items-center space-x-2">
                                        <Switch
                                          checked={section.props?.[key] !== false}
                                          onCheckedChange={(checked) => updateSectionProp(index, key, checked)}
                                        />
                                        <Label className="text-sm">{label}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {section.type === 'product_reviews' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={section.props?.showRating !== false}
                                        onCheckedChange={(checked) => updateSectionProp(index, 'showRating', checked)}
                                      />
                                      <Label className="text-sm">Show Rating Summary</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={section.props?.showReviewForm !== false}
                                        onCheckedChange={(checked) => updateSectionProp(index, 'showReviewForm', checked)}
                                      />
                                      <Label className="text-sm">Show Review Form</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={section.props?.showReviewStats !== false}
                                        onCheckedChange={(checked) => updateSectionProp(index, 'showReviewStats', checked)}
                                      />
                                      <Label className="text-sm">Show Review Statistics</Label>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {sections.length === 0 && (
            <Card className="p-8 text-center">
              <div className="space-y-2">
                <Package className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">No sections configured</h3>
                <p className="text-sm text-muted-foreground">
                  Add sections from the left panel to start customizing your product pages
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPageCustomizer;