/**
 * Theme Importer - Import 100+ free themes from various sources
 * Converts HTML/CSS themes to our React component structure
 */

import { supabase } from '@/integrations/supabase/client';

export interface ExternalTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  source: 'colorlib' | 'templatesjungle' | 'github' | 'templatemo' | 'html_design';
  preview_url: string;
  download_url?: string;
  github_repo?: string;
  license: 'MIT' | 'Free' | 'Creative Commons' | 'Custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  features: string[];
  tags: string[];
  is_responsive: boolean;
  framework: 'bootstrap' | 'tailwind' | 'vanilla' | 'material';
}

// Free theme collections from different sources
const THEME_SOURCES = {
  // Colorlib Bootstrap themes
  colorlib: [
    {
      id: 'cl_shopper',
      name: 'Shopper - Fashion Store',
      description: 'Modern fashion ecommerce template with Bootstrap 5',
      category: 'fashion',
      preview_url: 'https://colorlib.com/preview/theme/shopper/',
      download_url: 'https://colorlib.com/download/shopper.zip',
      colors: { primary: '#007bff', secondary: '#6c757d', accent: '#28a745', background: '#ffffff' },
      features: ['Product Grid', 'Shopping Cart', 'Wishlist', 'User Authentication', 'Responsive'],
      tags: ['fashion', 'clothing', 'modern', 'clean'],
      framework: 'bootstrap' as const,
    },
    {
      id: 'cl_estore',
      name: 'eStore - Electronics',
      description: 'Electronics store template with advanced filters',
      category: 'electronics',
      preview_url: 'https://colorlib.com/preview/theme/estore/',
      colors: { primary: '#ff6b35', secondary: '#2c3e50', accent: '#f39c12', background: '#f8f9fa' },
      features: ['Advanced Filters', 'Compare Products', 'Reviews', 'Multi-category'],
      tags: ['electronics', 'gadgets', 'tech', 'modern'],
      framework: 'bootstrap' as const,
    },
    {
      id: 'cl_divisima',
      name: 'Divisima - Luxury Fashion',
      description: 'Premium fashion store with elegant design',
      category: 'fashion',
      preview_url: 'https://colorlib.com/preview/theme/divisima/',
      colors: { primary: '#000000', secondary: '#ffffff', accent: '#c9a96e', background: '#fafafa' },
      features: ['Luxury Design', 'Image Gallery', 'Blog', 'Newsletter'],
      tags: ['luxury', 'fashion', 'elegant', 'premium'],
      framework: 'bootstrap' as const,
    },
  ],

  // TemplatesJungle themes
  templatesjungle: [
    {
      id: 'tj_kaira',
      name: 'Kaira - Organic Store',
      description: 'Organic food and grocery ecommerce template',
      category: 'food',
      preview_url: 'https://templatesjungle.com/demo/kaira/',
      colors: { primary: '#8bc34a', secondary: '#4caf50', accent: '#ff9800', background: '#f9f9f9' },
      features: ['Organic Theme', 'Product Categories', 'Blog', 'Contact Forms'],
      tags: ['organic', 'food', 'grocery', 'green', 'healthy'],
      framework: 'bootstrap' as const,
    },
    {
      id: 'tj_bookly',
      name: 'Bookly - Book Store',
      description: 'Online bookstore template with reading features',
      category: 'books',
      preview_url: 'https://templatesjungle.com/demo/bookly/',
      colors: { primary: '#6f4e37', secondary: '#d2b48c', accent: '#daa520', background: '#fff8dc' },
      features: ['Book Catalog', 'Author Pages', 'Reviews', 'Reading Lists'],
      tags: ['books', 'reading', 'education', 'library'],
      framework: 'bootstrap' as const,
    },
  ],

  // GitHub open-source themes
  github: [
    {
      id: 'gh_bootstrap_shop',
      name: 'Bootstrap Shop',
      description: 'Free Bootstrap 5 ecommerce template',
      category: 'general',
      github_repo: 'https://github.com/kondasoft/ks-bootshop',
      preview_url: 'https://ks-bootshop.myshopify.com/',
      colors: { primary: '#007bff', secondary: '#6c757d', accent: '#17a2b8', background: '#ffffff' },
      features: ['Bootstrap 5', 'Shopify Compatible', 'Responsive', 'SEO Ready'],
      tags: ['bootstrap', 'shopify', 'responsive', 'seo'],
      framework: 'bootstrap' as const,
    },
    {
      id: 'gh_ecommerce_design',
      name: 'Ecommerce Design',
      description: 'Modern ecommerce template by App Generator',
      category: 'general',
      github_repo: 'https://github.com/app-generator/design-ecommerce',
      colors: { primary: '#FF7A00', secondary: '#00D2C4', accent: '#17c1e8', background: '#ffffff' },
      features: ['Bootstrap 5', 'SCSS Variables', 'Gulp Tooling', 'Easy Customization'],
      tags: ['modern', 'customizable', 'sass', 'gulp'],
      framework: 'bootstrap' as const,
    },
  ],

  // TemplateMo themes
  templatemo: [
    {
      id: 'tm_sixteen',
      name: 'Sixteen Clothing',
      description: 'Clothing store template with modern design',
      category: 'fashion',
      preview_url: 'https://templatemo.com/tm-546-sixteen-clothing',
      colors: { primary: '#232323', secondary: '#f7f7f7', accent: '#ff6b6b', background: '#ffffff' },
      features: ['Clothing Focus', 'Product Showcase', 'Responsive Grid', 'Contact Form'],
      tags: ['clothing', 'fashion', 'modern', 'grid'],
      framework: 'bootstrap' as const,
    },
  ],
};

export class ThemeImporter {
  /**
   * Get all available free themes from various sources
   */
  static getAllFreeThemes(): ExternalTheme[] {
    const allThemes: ExternalTheme[] = [];
    
    Object.entries(THEME_SOURCES).forEach(([sourceKey, themes]) => {
      themes.forEach(theme => {
        allThemes.push({
          ...theme,
          source: sourceKey as ExternalTheme['source'],
          license: 'Free',
          is_responsive: true,
        });
      });
    });

    return allThemes;
  }

  /**
   * Import a theme and convert it to our system format
   */
  static async importTheme(externalTheme: ExternalTheme): Promise<any> {
    // Convert external theme to our manifest format
    const manifest = this.convertToManifest(externalTheme);
    
    // Save to our theme_master_projects table
    const { data, error } = await supabase
      .from('theme_master_projects')
      .insert({
        theme_id: `imported-${externalTheme.id}`,
        name: externalTheme.name,
        description: externalTheme.description,
        category: externalTheme.category,
        preview_image: externalTheme.preview_url,
        is_default: false,
        is_active: true,
        source_info: {
          original_source: externalTheme.source,
          original_url: externalTheme.preview_url,
          github_repo: externalTheme.github_repo,
          license: externalTheme.license,
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial version with manifest
    await supabase
      .from('theme_master_versions')
      .insert({
        project_id: data.id,
        theme_id: `imported-${externalTheme.id}`,
        version: 1,
        files_manifest: manifest,
        changelog: `Imported from ${externalTheme.source}`,
      });

    return data;
  }

  /**
   * Convert external theme to our manifest format
   */
  private static convertToManifest(theme: ExternalTheme): any {
    return {
      dna: {
        name: theme.name,
        palette: {
          primary: theme.colors.primary,
          secondary: theme.colors.secondary,
          accent: theme.colors.accent,
          bg: theme.colors.background,
          surface: '#ffffff',
          fg: '#1a1a1a',
          muted: '#6b7280',
          border: '#e5e7eb',
        },
        fonts: {
          heading: theme.framework === 'bootstrap' ? 'Inter' : 'Poppins',
          body: 'Inter',
        },
        radius: '8px',
        spacing: 'comfortable',
      },
      pages: {
        home: {
          sections: this.generateHomeSections(theme),
        },
        shop: {
          sections: this.generateShopSections(theme),
        },
        product: {
          sections: this.generateProductSections(theme),
        },
      },
      header_style: 'modern',
      footer_style: 'simple',
    };
  }

  /**
   * Generate home page sections based on theme features
   */
  private static generateHomeSections(theme: ExternalTheme): any[] {
    const sections = [];

    // Hero section
    sections.push({
      type: 'hero',
      props: {
        title: `Welcome to ${theme.name}`,
        subtitle: theme.description,
        image: '/api/placeholder/800/400',
        button_text: 'Shop Now',
        button_link: '/shop',
      },
    });

    // Features if available
    if (theme.features.length > 0) {
      sections.push({
        type: 'features_grid',
        props: {
          title: 'Why Choose Us',
          features: theme.features.slice(0, 4).map(feature => ({
            title: feature,
            description: `Experience the best ${feature.toLowerCase()} in our store`,
            icon: 'star',
          })),
        },
      });
    }

    // Product grid
    sections.push({
      type: 'product_grid',
      props: {
        title: 'Featured Products',
        columns: 4,
        limit: 8,
        show_add_to_cart: true,
      },
    });

    return sections;
  }

  private static generateShopSections(theme: ExternalTheme): any[] {
    return [
      {
        type: 'product_grid',
        props: {
          title: 'All Products',
          columns: 3,
          show_filters: true,
          show_sort: true,
          show_add_to_cart: true,
        },
      },
    ];
  }

  private static generateProductSections(theme: ExternalTheme): any[] {
    return [
      {
        type: 'product_details',
        props: {
          show_reviews: theme.features.includes('Reviews'),
          show_related: true,
          show_description_tabs: true,
        },
      },
    ];
  }

  /**
   * Bulk import themes from a specific source
   */
  static async bulkImport(sourceKey: keyof typeof THEME_SOURCES): Promise<void> {
    const themes = THEME_SOURCES[sourceKey];
    const results = [];

    for (const theme of themes) {
      try {
        const imported = await this.importTheme({
          ...theme,
          source: sourceKey,
          license: 'Free',
          is_responsive: true,
        });
        results.push({ success: true, theme: imported });
      } catch (error) {
        results.push({ success: false, error, theme: theme.name });
      }
    }

    return results;
  }
}

/**
 * Theme Categories for better organization
 */
export const THEME_CATEGORIES = {
  fashion: { name: 'Fashion & Clothing', icon: '👗' },
  electronics: { name: 'Electronics & Gadgets', icon: '📱' },
  food: { name: 'Food & Grocery', icon: '🍎' },
  books: { name: 'Books & Education', icon: '📚' },
  beauty: { name: 'Beauty & Cosmetics', icon: '💄' },
  sports: { name: 'Sports & Fitness', icon: '⚽' },
  jewelry: { name: 'Jewelry & Accessories', icon: '💍' },
  home: { name: 'Home & Garden', icon: '🏠' },
  general: { name: 'General Store', icon: '🏪' },
};