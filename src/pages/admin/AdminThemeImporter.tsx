import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, ExternalLink, Search, Filter, Package, 
  Github, Globe, Loader2, Check, Plus, Eye 
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeImporter, type ExternalTheme, THEME_CATEGORIES } from '@/lib/themeImporter';

const AdminThemeImporter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [importing, setImporting] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Get all available free themes
  const { data: availableThemes = [], isLoading } = useQuery({
    queryKey: ['available-themes'],
    queryFn: () => ThemeImporter.getAllFreeThemes(),
  });

  // Import single theme mutation
  const importThemeMutation = useMutation({
    mutationFn: (theme: ExternalTheme) => ThemeImporter.importTheme(theme),
    onSuccess: (data, theme) => {
      toast.success(`"${theme.name}" imported successfully!`);
      queryClient.invalidateQueries({ queryKey: ['theme-masters'] });
      setImporting(prev => prev.filter(id => id !== theme.id));
    },
    onError: (error, theme) => {
      toast.error(`Failed to import "${theme.name}": ${error.message}`);
      setImporting(prev => prev.filter(id => id !== theme.id));
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: (source: keyof typeof THEME_CATEGORIES) => 
      ThemeImporter.bulkImport(source as any),
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      toast.success(`Bulk import complete: ${successful} success, ${failed} failed`);
      queryClient.invalidateQueries({ queryKey: ['theme-masters'] });
    },
  });

  // Filter themes
  const filteredThemes = availableThemes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         theme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         theme.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || theme.category === selectedCategory;
    const matchesSource = selectedSource === 'all' || theme.source === selectedSource;
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  const handleImportTheme = async (theme: ExternalTheme) => {
    setImporting(prev => [...prev, theme.id]);
    importThemeMutation.mutate(theme);
  };

  const handleBulkImport = (source: string) => {
    bulkImportMutation.mutate(source as any);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'github': return <Github className="h-4 w-4" />;
      case 'colorlib': return <Package className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'github': return 'bg-gray-100 text-gray-800';
      case 'colorlib': return 'bg-blue-100 text-blue-800';
      case 'templatesjungle': return 'bg-green-100 text-green-800';
      case 'templatemo': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Theme Importer</h1>
          <p className="text-muted-foreground">Import 100+ free themes from various sources</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleBulkImport('colorlib')}
            disabled={bulkImportMutation.isPending}
            variant="outline"
          >
            {bulkImportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Bulk Import Colorlib
          </Button>
          <Button
            onClick={() => handleBulkImport('github')}
            disabled={bulkImportMutation.isPending}
            variant="outline"
          >
            <Github className="h-4 w-4 mr-2" />
            Bulk Import GitHub
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Themes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableThemes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(THEME_CATEGORIES).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">GitHub, Colorlib, etc.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredThemes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search themes by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(THEME_CATEGORIES).map(([key, category]) => (
              <SelectItem key={key} value={key}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="colorlib">Colorlib</SelectItem>
            <SelectItem value="templatesjungle">Templates Jungle</SelectItem>
            <SelectItem value="templatemo">TemplateMo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Themes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme) => {
            const isImporting = importing.includes(theme.id);
            
            return (
              <Card key={theme.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{theme.name}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {theme.description}
                      </p>
                    </div>
                    <Badge className={`ml-2 ${getSourceColor(theme.source)}`}>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(theme.source)}
                        <span className="text-xs">{theme.source}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview iframe placeholder */}
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Theme Preview</p>
                    </div>
                  </div>

                  {/* Theme info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{THEME_CATEGORIES[theme.category]?.icon}</Badge>
                      <Badge variant="outline">{THEME_CATEGORIES[theme.category]?.name}</Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {theme.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {theme.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{theme.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {theme.features.slice(0, 2).map(feature => (
                        <Badge key={feature} className="text-xs bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleImportTheme(theme)}
                      disabled={isImporting}
                      className="flex-1"
                      size="sm"
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(theme.preview_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredThemes.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No themes found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or check back later for new themes.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminThemeImporter;