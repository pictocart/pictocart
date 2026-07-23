-- 1. Seed Tailwind Open Source Themes into theme_master_projects
INSERT INTO public.theme_master_projects (
  theme_id,
  name,
  description,
  category,
  is_default,
  is_active,
  is_premium,
  price,
  compare_at_price,
  preview_image,
  client_patch_prompt
)
VALUES
(
  'tailblocks-minimalist',
  'Tailblocks Minimalist',
  'Clean layouts sourced from open-source Tailblocks. Features a spacious grid, subtle animations, and a Scandinavian aesthetic.',
  'general',
  false,
  true,
  false,
  0,
  NULL,
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60',
  'Tailblocks-inspired clean design layout.'
),
(
  'daisyui-playful',
  'DaisyUI Bubbly',
  'A vibrant, playful theme using bubble style styling, soft neon colors, and friendly cards. Perfect for gifts, toys, and lifestyle items.',
  'general',
  false,
  true,
  false,
  0,
  NULL,
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=60',
  'Playful layout with rounded buttons and soft shadows.'
),
(
  'flowbite-corporate',
  'Flowbite Corporate',
  'Sleek, modern corporate storefront layout. Features distinct header cards, uniform grid divisions, and clean borders.',
  'general',
  false,
  true,
  false,
  0,
  NULL,
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60',
  'Corporate style with sharp lines and high-contrast accents.'
)
ON CONFLICT (theme_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  preview_image = EXCLUDED.preview_image;


-- 2. Seed corresponding files_manifest into theme_master_versions (Version 1)

-- 2a. Seed Tailblocks Minimalist Manifest
INSERT INTO public.theme_master_versions (theme_id, version, files_manifest)
VALUES (
  'tailblocks-minimalist',
  1,
  '{
    "version": 2,
    "kind": "product",
    "dna": {
      "name": "Tailblocks Minimalist",
      "tagline": "Clean, elegant, open-source Tailwind layout",
      "vibe": "minimal modern scandinavian",
      "radius": "6px",
      "palette": {
        "primary": "#10b981",
        "primary_fg": "#ffffff",
        "accent": "#3b82f6",
        "bg": "#ffffff",
        "surface": "#f9fafb",
        "fg": "#1f2937",
        "muted": "#6b7280",
        "border": "#e5e7eb"
      },
      "fonts": {
        "heading": "Inter",
        "body": "Inter",
        "heading_weight": 700
      }
    },
    "layout": {
      "header_style": "classic",
      "density": "balanced"
    },
    "hero_image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60",
    "pages": {
      "home": {
        "sections": [
          {
            "type": "hero",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font\"><div class=\"container mx-auto flex px-6 py-16 md:flex-row flex-col items-center\"><div class=\"lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center\"><h1 class=\"title-font sm:text-4xl text-3xl mb-4 font-bold text-gray-900\">Before they sold out<br class=\"hidden lg:inline-block\">readymade gluten</h1><p class=\"mb-8 leading-relaxed text-sm text-gray-500\">Copper mug try-hard pitchfork pour-over freegan heirloom neutra air plant cold-pressed tacos poke beard mustache. Lomo occupy waistcoat tapemick.</p><div class=\"flex justify-center\"><button class=\"inline-flex text-white bg-emerald-500 border-0 py-2.5 px-6 focus:outline-none hover:bg-emerald-600 rounded text-sm font-semibold transition-all\">Shop Now</button><button class=\"ml-4 inline-flex text-gray-700 bg-gray-100 border-0 py-2.5 px-6 focus:outline-none hover:bg-gray-200 rounded text-sm font-semibold transition-all\">Learn More</button></div></div><div class=\"lg:max-w-lg lg:w-full md:w-1/2 w-5/6\"><img class=\"object-cover object-center rounded-lg shadow-md\" alt=\"hero\" src=\"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60\"></div></div></section>"
            }
          },
          {
            "type": "usp_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font border-y border-gray-200 bg-gray-50\"><div class=\"container px-6 py-8 mx-auto flex flex-wrap justify-between items-center\"><div class=\"flex md:flex-nowrap flex-wrap justify-center items-center gap-12 w-full\"><div class=\"flex items-center gap-3\"><span class=\"text-emerald-500 text-xl font-bold\">🚚</span><div><p class=\"text-sm font-semibold text-gray-900\">Free Shipping</p><p class=\"text-xs text-gray-500\">On all orders above ₹999</p></div></div><div class=\"flex items-center gap-3\"><span class=\"text-emerald-500 text-xl font-bold\">🛡️</span><div><p class=\"text-sm font-semibold text-gray-900\">Secure Payments</p><p class=\"text-xs text-gray-500\">100% protected checkout</p></div></div><div class=\"flex items-center gap-3\"><span class=\"text-emerald-500 text-xl font-bold\">✨</span><div><p class=\"text-sm font-semibold text-gray-900\">Easy Returns</p><p class=\"text-xs text-gray-500\">7-day hassle-free policy</p></div></div></div></div></section>"
            }
          },
          {
            "type": "category_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font\"><div class=\"container px-6 py-16 mx-auto\"><div class=\"flex flex-col text-center w-full mb-12\"><h2 class=\"text-xs text-emerald-500 tracking-widest font-semibold title-font mb-1 uppercase\">Categories</h2><h1 class=\"sm:text-3xl text-2xl font-bold title-font text-gray-900\">Shop by Department</h1></div><div class=\"flex flex-wrap -m-4\"><div class=\"p-4 md:w-1/3\"><div class=\"h-full border border-gray-200 rounded-lg overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition\"><img class=\"lg:h-48 md:h-36 w-full object-cover object-center group-hover:scale-102 transition duration-300\" src=\"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&auto=format&fit=crop&q=60\" alt=\"Fashion\"><div class=\"p-6\"><h1 class=\"title-font text-lg font-bold text-gray-900 mb-2\">Apparel & Fashion</h1><p class=\"leading-relaxed mb-3 text-xs text-gray-500\">Upgrade your wardrobe with our latest season collections and trending accessories.</p></div></div></div><div class=\"p-4 md:w-1/3\"><div class=\"h-full border border-gray-200 rounded-lg overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition\"><img class=\"lg:h-48 md:h-36 w-full object-cover object-center group-hover:scale-102 transition duration-300\" src=\"https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60\" alt=\"Beauty\"><div class=\"p-6\"><h1 class=\"title-font text-lg font-bold text-gray-900 mb-2\">Beauty & Cosmetics</h1><p class=\"leading-relaxed mb-3 text-xs text-gray-500\">Natural ingredients and premium self-care products for your daily glowing routine.</p></div></div></div><div class=\"p-4 md:w-1/3\"><div class=\"h-full border border-gray-200 rounded-lg overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition\"><img class=\"lg:h-48 md:h-36 w-full object-cover object-center group-hover:scale-102 transition duration-300\" src=\"https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&auto=format&fit=crop&q=60\" alt=\"Home Decor\"><div class=\"p-6\"><h1 class=\"title-font text-lg font-bold text-gray-900 mb-2\">Home Decor</h1><p class=\"leading-relaxed mb-3 text-xs text-gray-500\">Minimalist designs and elegant artifacts to bring comfort and style to your spaces.</p></div></div></div></div></div></section>"
            }
          },
          {
            "type": "product_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font\"><div class=\"container px-6 py-16 mx-auto\"><div class=\"flex flex-col text-center w-full mb-12\"><h2 class=\"text-xs text-emerald-500 tracking-widest font-semibold title-font mb-1 uppercase\">Best Sellers</h2><h1 class=\"sm:text-3xl text-2xl font-bold title-font text-gray-900\">Trending Store Items</h1></div><div class=\"flex flex-wrap -m-4\"><div class=\"lg:w-1/4 md:w-1/2 p-4 w-full\"><a class=\"block relative h-48 rounded overflow-hidden shadow-sm border hover:shadow-md transition\"><img alt=\"ecommerce\" class=\"object-cover object-center w-full h-full block\" src=\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60\"></a><div class=\"mt-4\"><h3 class=\"text-gray-500 text-[10px] tracking-widest title-font mb-1 uppercase\">Accessories</h3><h2 class=\"text-gray-900 title-font text-sm font-semibold\">Smart White Watch</h2><p class=\"mt-1 text-sm font-bold text-emerald-600\">₹2,499</p></div></div><div class=\"lg:w-1/4 md:w-1/2 p-4 w-full\"><a class=\"block relative h-48 rounded overflow-hidden shadow-sm border hover:shadow-md transition\"><img alt=\"ecommerce\" class=\"object-cover object-center w-full h-full block\" src=\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60\"></a><div class=\"mt-4\"><h3 class=\"text-gray-500 text-[10px] tracking-widest title-font mb-1 uppercase\">Electronics</h3><h2 class=\"text-gray-900 title-font text-sm font-semibold\">Wireless Headphones</h2><p class=\"mt-1 text-sm font-bold text-emerald-600\">₹4,999</p></div></div><div class=\"lg:w-1/4 md:w-1/2 p-4 w-full\"><a class=\"block relative h-48 rounded overflow-hidden shadow-sm border hover:shadow-md transition\"><img alt=\"ecommerce\" class=\"object-cover object-center w-full h-full block\" src=\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60\"></a><div class=\"mt-4\"><h3 class=\"text-gray-500 text-[10px] tracking-widest title-font mb-1 uppercase\">Shoes</h3><h2 class=\"text-gray-900 title-font text-sm font-semibold\">Red Running Sneakers</h2><p class=\"mt-1 text-sm font-bold text-emerald-600\">₹3,299</p></div></div><div class=\"lg:w-1/4 md:w-1/2 p-4 w-full\"><a class=\"block relative h-48 rounded overflow-hidden shadow-sm border hover:shadow-md transition\"><img alt=\"ecommerce\" class=\"object-cover object-center w-full h-full block\" src=\"https://images.unsplash.com/photo-1527719327859-c6ce802585e4?w=500&auto=format&fit=crop&q=60\"></a><div class=\"mt-4\"><h3 class=\"text-gray-500 text-[10px] tracking-widest title-font mb-1 uppercase\">Apparel</h3><h2 class=\"text-gray-900 title-font text-sm font-semibold\">Classic Cotton Tee</h2><p class=\"mt-1 text-sm font-bold text-emerald-600\">₹799</p></div></div></div></div></section>"
            }
          },
          {
            "type": "story",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font bg-gray-50 border-y\"><div class=\"container px-6 py-16 mx-auto flex flex-wrap\"><div class=\"flex flex-wrap w-full\"><div class=\"lg:w-2/5 md:w-1/2 md:pr-10 md:py-6\"><div class=\"flex relative pb-10\"><div class=\"h-full w-10 absolute inset-0 flex items-center justify-center\"><div class=\"w-1 h-full bg-gray-200\"></div></div><div class=\"flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 inline-flex items-center justify-center text-white relative z-10 text-xs font-bold\">1</div><div class=\"flex-grow pl-4\"><h2 class=\"font-semibold title-font text-xs text-gray-900 mb-1 uppercase tracking-wider\">Premium Sourcing</h2><p class=\"leading-relaxed text-xs text-gray-500\">We source only the finest raw organic elements from sustainable farms across the country.</p></div></div><div class=\"flex relative pb-10\"><div class=\"h-full w-10 absolute inset-0 flex items-center justify-center\"><div class=\"w-1 h-full bg-gray-200\"></div></div><div class=\"flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 inline-flex items-center justify-center text-white relative z-10 text-xs font-bold\">2</div><div class=\"flex-grow pl-4\"><h2 class=\"font-semibold title-font text-xs text-gray-900 mb-1 uppercase tracking-wider\">Artisanal Crafting</h2><p class=\"leading-relaxed text-xs text-gray-500\">Every item is assembled with precision and care by expert local craftsmen.</p></div></div><div class=\"flex relative\"><div class=\"flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 inline-flex items-center justify-center text-white relative z-10 text-xs font-bold\">3</div><div class=\"flex-grow pl-4\"><h2 class=\"font-semibold title-font text-xs text-gray-900 mb-1 uppercase tracking-wider\">Safe Delivery</h2><p class=\"leading-relaxed text-xs text-gray-500\">Safe packaging and fully carbon-offset logistics straight to your doorstep.</p></div></div></div><img class=\"lg:w-3/5 md:w-1/2 object-cover object-center rounded-lg md:mt-0 mt-12 shadow-md\" src=\"https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=60\" alt=\"step\"></div></div></section>"
            }
          },
          {
            "type": "journal_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font\"><div class=\"container px-6 py-16 mx-auto\"><div class=\"flex flex-wrap w-full mb-10 flex-col items-center text-center\"><h1 class=\"sm:text-3xl text-2xl font-bold title-font mb-2 text-gray-900\">From the Journal</h1><p class=\"lg:w-1/2 w-full leading-relaxed text-xs text-gray-500\">Read our guides on lifestyle, minimalist living, and quality care instructions.</p></div><div class=\"flex flex-wrap -m-4\"><div class=\"xl:w-1/3 md:w-1/2 p-4 w-full\"><div class=\"border border-gray-200 p-6 rounded-lg bg-white shadow-sm\"><span class=\"text-emerald-500 text-[10px] font-bold uppercase tracking-wider\">Lifestyle</span><h2 class=\"text-base text-gray-900 font-bold title-font mb-2 mt-1\">Sustaining Minimalist Spaces</h2><p class=\"leading-relaxed text-xs text-gray-500\">Practical tips on decluttering your bedroom and living rooms for a peaceful daily aesthetic.</p></div></div><div class=\"xl:w-1/3 md:w-1/2 p-4 w-full\"><div class=\"border border-gray-200 p-6 rounded-lg bg-white shadow-sm\"><span class=\"text-emerald-500 text-[10px] font-bold uppercase tracking-wider\">Material</span><h2 class=\"text-base text-gray-900 font-bold title-font mb-2 mt-1\">Caring for Organic Cotton</h2><p class=\"leading-relaxed text-xs text-gray-500\">A full washing and drying guide to keep your premium apparel soft and durable for years.</p></div></div><div class=\"xl:w-1/3 md:w-1/2 p-4 w-full\"><div class=\"border border-gray-200 p-6 rounded-lg bg-white shadow-sm\"><span class=\"text-emerald-500 text-[10px] font-bold uppercase tracking-wider\">Community</span><h2 class=\"text-base text-gray-900 font-bold title-font mb-2 mt-1\">Supporting Local Artisans</h2><p class=\"leading-relaxed text-xs text-gray-500\">Behind the scenes of how our Rajasthan partners craft their stunning block print bedsheets.</p></div></div></div></div></section>"
            }
          },
          {
            "type": "newsletter",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"text-gray-600 body-font bg-emerald-50 border-t border-emerald-100\"><div class=\"container px-6 py-16 mx-auto flex items-center md:flex-row flex-col\"><div class=\"flex flex-col md:pr-10 md:mb-0 mb-6 pr-0 w-full md:w-auto md:text-left text-center\"><h2 class=\"text-xs text-emerald-500 tracking-widest font-semibold title-font mb-1 uppercase\">Subscribe</h2><h1 class=\"md:text-3xl text-2xl font-bold title-font text-gray-900\">Get 10% off your first order</h1></div><div class=\"flex md:ml-auto md:mr-0 mx-auto items-center flex-shrink-0 space-x-3\"><input type=\"text\" placeholder=\"you@example.com\" class=\"w-full bg-white rounded border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm outline-none text-gray-700 py-2 px-3 leading-8 transition-colors duration-200 ease-in-out\"><button class=\"inline-flex text-white bg-emerald-500 border-0 py-2 px-5 focus:outline-none hover:bg-emerald-600 rounded text-sm font-bold whitespace-nowrap transition-all\">Join List</button></div></div></section>"
            }
          }
        ]
      },
      "auth": {
        "sections": [
          { "type": "signup", "props": { "title": "Create your account", "cta": "Sign up" } },
          { "type": "signin", "props": { "title": "Welcome back", "cta": "Sign in" } },
          { "type": "forgot_password", "props": { "title": "Reset password", "cta": "Send link" } },
          { "type": "reset_password", "props": { "title": "Choose new password", "cta": "Update password" } }
        ]
      },
      "shop": {
        "sections": [
          { "type": "product_grid", "props": { "title": "All Products", "items": [] } }
        ]
      },
      "product": {
        "sections": [
          { "type": "product_detail", "props": {} }
        ]
      },
      "cart": {
        "sections": [
          { "type": "line_items", "props": {} },
          { "type": "cart_summary", "props": { "cta": "Checkout" } }
        ]
      },
      "checkout": {
        "sections": [
          { "type": "checkout_stepper", "props": { "steps": ["address", "shipping", "payment", "review"] } }
        ]
      },
      "journal": {
        "sections": [
          { "type": "journal_list", "props": { "limit": 12 } }
        ]
      },
      "about": {
        "sections": [
          { "type": "story", "props": { "title": "Our Story", "body": "We make beautiful things." } },
          { "type": "values", "props": { "items": ["Sustainability", "Transparency", "Quality"] } }
        ]
      },
      "contact": {
        "sections": [
          { "type": "contact_form", "props": { "email": "hello@store.in", "phone": "+91 99999 99999" } }
        ]
      },
      "account": {
        "sections": [
          { "type": "account_panel", "props": { "tabs": ["orders", "addresses", "wishlist", "profile"] } }
        ]
      }
    }
  }'
)
ON CONFLICT (theme_id, version) DO NOTHING;


-- 2b. Seed DaisyUI Bubbly Manifest
INSERT INTO public.theme_master_versions (theme_id, version, files_manifest)
VALUES (
  'daisyui-playful',
  1,
  '{
    "version": 2,
    "kind": "product",
    "dna": {
      "name": "DaisyUI Bubbly",
      "tagline": "Vibrant, playful theme with bubbly elements",
      "vibe": "playful colorful rounded friendly",
      "radius": "20px",
      "palette": {
        "primary": "#6366f1",
        "primary_fg": "#ffffff",
        "accent": "#ec4899",
        "bg": "#ffffff",
        "surface": "#f3f4f6",
        "fg": "#111827",
        "muted": "#4b5563",
        "border": "#e5e7eb"
      },
      "fonts": {
        "heading": "Plus Jakarta Sans",
        "body": "Plus Jakarta Sans",
        "heading_weight": 800
      }
    },
    "layout": {
      "header_style": "floating_pill",
      "density": "airy"
    },
    "hero_image": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=60",
    "pages": {
      "home": {
        "sections": [
          {
            "type": "hero",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"relative bg-gradient-to-br from-indigo-50 via-white to-pink-50 py-16 px-6 overflow-hidden\"><div class=\"container mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 max-w-5xl\"><div class=\"flex-1 text-left space-y-6\"><span class=\"inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold uppercase tracking-wider\">Special Offer!</span><h1 class=\"text-5xl font-black leading-tight text-indigo-950\">Bring Bubbly Joy To Your Home</h1><p class=\"text-gray-600 text-sm leading-relaxed\">Discover quirky, fun, and beautifully curated toys, accessories, and gifts crafted with sustainable material.</p><div class=\"flex items-center gap-4\"><button class=\"px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all\">Shop Now</button><button class=\"px-8 py-3 rounded-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold transition-all\">Explore Catalog</button></div></div><div class=\"flex-1 relative flex justify-center\"><div class=\"absolute w-72 h-72 rounded-full bg-pink-200/50 filter blur-2xl -top-4 -left-4\"></div><img src=\"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60\" class=\"w-80 rounded-3xl shadow-2xl relative z-10 hover:scale-102 transition duration-500\"></div></div></section>"
            }
          },
          {
            "type": "usp_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"bg-indigo-50/50 border-y border-indigo-100\"><div class=\"container px-6 py-6 mx-auto flex flex-wrap justify-between items-center\"><div class=\"flex md:flex-nowrap flex-wrap justify-center items-center gap-12 w-full\"><div class=\"flex items-center gap-3\"><div class=\"p-2.5 rounded-full bg-indigo-100 text-indigo-600 text-lg\">⚡</div><div><p class=\"text-xs font-black text-indigo-950 uppercase\">Instant Setup</p><p class=\"text-[10px] text-gray-500\">Starts running in 2 mins</p></div></div><div class=\"flex items-center gap-3\"><div class=\"p-2.5 rounded-full bg-indigo-100 text-indigo-600 text-lg\">💖</div><div><p class=\"text-xs font-black text-indigo-950 uppercase\">Free Returns</p><p class=\"text-[10px] text-gray-500\">No questions asked policy</p></div></div><div class=\"flex items-center gap-3\"><div class=\"p-2.5 rounded-full bg-indigo-100 text-indigo-600 text-lg\">🎁</div><div><p class=\"text-xs font-black text-indigo-950 uppercase\">Gift Wrap</p><p class=\"text-[10px] text-gray-500\">Free festive wrap available</p></div></div></div></div></section>"
            }
          },
          {
            "type": "category_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-white\"><div class=\"container px-6 mx-auto\"><div class=\"text-center mb-12\"><h1 class=\"text-3xl font-black text-indigo-950\">Shop Bubbly Categories</h1><p class=\"text-gray-500 text-xs mt-2\">Bright, happy collections curated just for you</p></div><div class=\"grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto\"><div class=\"p-4 rounded-3xl bg-indigo-50 border border-indigo-100 text-center hover:scale-105 transition cursor-pointer\"><span class=\"text-3xl\">🎁</span><h3 class=\"font-bold mt-2 text-indigo-950 text-sm\">Cute Gifts</h3></div><div class=\"p-4 rounded-3xl bg-pink-50 border border-pink-100 text-center hover:scale-105 transition cursor-pointer\"><span class=\"text-3xl\">🧸</span><h3 class=\"font-bold mt-2 text-indigo-950 text-sm\">Plush Toys</h3></div><div class=\"p-4 rounded-3xl bg-purple-50 border border-purple-100 text-center hover:scale-105 transition cursor-pointer\"><span class=\"text-3xl\">🦄</span><h3 class=\"font-bold mt-2 text-indigo-950 text-sm\">Accessories</h3></div><div class=\"p-4 rounded-3xl bg-amber-50 border border-amber-100 text-center hover:scale-105 transition cursor-pointer\"><span class=\"text-3xl\">🎨</span><h3 class=\"font-bold mt-2 text-indigo-950 text-sm\">Art Kits</h3></div></div></div></section>"
            }
          },
          {
            "type": "product_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-gray-50 border-t\"><div class=\"container px-6 mx-auto\"><div class=\"text-center mb-12\"><h1 class=\"text-3xl font-black text-indigo-950\">Bubbly Favorites</h1><p class=\"text-gray-500 text-xs mt-2\">Items that bring an instant smile</p></div><div class=\"grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto\"><div class=\"rounded-3xl border border-gray-200 overflow-hidden shadow-sm bg-white hover:shadow-lg transition flex flex-col h-full\"><div class=\"aspect-square bg-indigo-50 relative\"><img class=\"object-cover w-full h-full\" src=\"https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=60\"><span class=\"absolute top-3 right-3 bg-pink-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full\">Cute</span></div><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-indigo-950 truncate\">Retro Game Console</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-black text-indigo-600\">₹1,899</span><button class=\"p-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 text-xs font-bold\">+ Add</button></div></div></div><div class=\"rounded-3xl border border-gray-200 overflow-hidden shadow-sm bg-white hover:shadow-lg transition flex flex-col h-full\"><div class=\"aspect-square bg-indigo-50 relative\"><img class=\"object-cover w-full h-full\" src=\"https://images.unsplash.com/photo-1559251606-c623743a6d76?w=400&auto=format&fit=crop&q=60\"><span class=\"absolute top-3 right-3 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full\">Soft</span></div><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-indigo-950 truncate\">Plush Pink Bunny</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-black text-indigo-600\">₹1,249</span><button class=\"p-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 text-xs font-bold\">+ Add</button></div></div></div><div class=\"rounded-3xl border border-gray-200 overflow-hidden shadow-sm bg-white hover:shadow-lg transition flex flex-col h-full\"><div class=\"aspect-square bg-indigo-50 relative\"><img class=\"object-cover w-full h-full\" src=\"https://images.unsplash.com/photo-1515488042361-404e9250afef?w=400&auto=format&fit=crop&q=60\"><span class=\"absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full\">Fun</span></div><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-indigo-950 truncate\">Wooden Activity Train</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-black text-indigo-600\">₹2,199</span><button class=\"p-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 text-xs font-bold\">+ Add</button></div></div></div><div class=\"rounded-3xl border border-gray-200 overflow-hidden shadow-sm bg-white hover:shadow-lg transition flex flex-col h-full\"><div class=\"aspect-square bg-indigo-50 relative\"><img class=\"object-cover w-full h-full\" src=\"https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&auto=format&fit=crop&q=60\"></div><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-indigo-950 truncate\">Colorful Building Blocks</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-black text-indigo-600\">₹950</span><button class=\"p-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 text-xs font-bold\">+ Add</button></div></div></div></div></div></section>"
            }
          },
          {
            "type": "story",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-pink-50/30\"><div class=\"container px-6 mx-auto flex flex-col md:flex-row items-center gap-12 max-w-5xl\"><div class=\"flex-1\"><img class=\"rounded-3xl shadow-xl\" src=\"https://images.unsplash.com/photo-1515488042361-404e9250afef?w=600&auto=format&fit=crop&q=60\"></div><div class=\"flex-1 text-left space-y-4\"><h2 class=\"text-3xl font-black text-indigo-950\">Designed with Pure Joy</h2><p class=\"text-gray-600 text-sm leading-relaxed\">Our products are lovingly conceptualised and hand-crafted by designers who believe childhood wonder should last forever. We run strict safety checkups on non-toxic paints and sustainable fibers so you can buy with confidence.</p><ul class=\"space-y-2 text-xs font-bold text-indigo-950\"><li class=\"flex items-center gap-2\"><span class=\"text-emerald-500\">☘️</span> 100% Organic Wood & Yarn</li><li class=\"flex items-center gap-2\"><span class=\"text-emerald-500\">🎨</span> Lead-free Non-toxic Paints</li><li class=\"flex items-center gap-2\"><span class=\"text-emerald-500\">🇮🇳</span> Handcrafted in Rajasthan</li></ul></div></div></section>"
            }
          },
          {
            "type": "journal_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-white border-t\"><div class=\"container px-6 mx-auto\"><div class=\"text-center mb-10\"><h1 class=\"text-3xl font-black text-indigo-950\">Parenting & Play</h1><p class=\"text-gray-500 text-xs mt-2\">Curated readables for raising happy kids</p></div><div class=\"grid md:grid-cols-3 gap-6 max-w-4xl mx-auto\"><div class=\"p-6 rounded-3xl bg-indigo-50/50 border shadow-sm\"><span class=\"bg-indigo-200 text-indigo-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider\">Play</span><h3 class=\"text-sm font-bold text-indigo-950 mt-3\">Sensory Play for 1-3 Year Olds</h3><p class=\"text-xs text-gray-500 mt-2\">Simple at-home activities to boost child hand-eye coordination using natural textures.</p></div><div class=\"p-6 rounded-3xl bg-pink-50/50 border shadow-sm\"><span class=\"bg-pink-200 text-pink-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider\">Spaces</span><h3 class=\"text-sm font-bold text-indigo-950 mt-3\">Setting Up a Creative Toy Corner</h3><p class=\"text-xs text-gray-500 mt-2\">Organising playspaces to encourage independent clean-up and toy discovery routines.</p></div><div class=\"p-6 rounded-3xl bg-purple-50/50 border shadow-sm\"><span class=\"bg-purple-200 text-purple-700 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider\">Safety</span><h3 class=\"text-sm font-bold text-indigo-950 mt-3\">Spotting Toy Material Dangers</h3><p class=\"text-xs text-gray-500 mt-2\">A quick checklist of standard synthetic plastic hazards to avoid when shopping for infants.</p></div></div></div></section>"
            }
          },
          {
            "type": "newsletter",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"bg-indigo-600 text-white rounded-3xl py-12 px-8 max-w-4xl mx-auto my-12 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6\"><div class=\"text-left\"><h2 class=\"text-2xl font-black\">Join the Bubbly Family!</h2><p class=\"text-xs text-indigo-100 mt-1\">Receive weekly play ideas and secret discount codes.</p></div><div class=\"flex items-center gap-2 w-full md:w-auto\"><input type=\"text\" placeholder=\"bubbly@gmail.com\" class=\"px-4 py-2.5 rounded-full text-indigo-950 outline-none text-sm w-full md:w-64 border border-indigo-400\"><button class=\"px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-black text-sm rounded-full whitespace-nowrap shadow-md\">Join Us</button></div></section>"
            }
          }
        ]
      },
      "auth": {
        "sections": [
          { "type": "signup", "props": { "title": "Create your bubbly account", "cta": "Sign up" } },
          { "type": "signin", "props": { "title": "Welcome back to play", "cta": "Sign in" } },
          { "type": "forgot_password", "props": { "title": "Reset password", "cta": "Send link" } },
          { "type": "reset_password", "props": { "title": "Choose new password", "cta": "Update password" } }
        ]
      },
      "shop": {
        "sections": [
          { "type": "product_grid", "props": { "title": "Browse Products", "items": [] } }
        ]
      },
      "product": {
        "sections": [
          { "type": "product_detail", "props": {} }
        ]
      },
      "cart": {
        "sections": [
          { "type": "line_items", "props": {} },
          { "type": "cart_summary", "props": { "cta": "Checkout" } }
        ]
      },
      "checkout": {
        "sections": [
          { "type": "checkout_stepper", "props": { "steps": ["address", "shipping", "payment", "review"] } }
        ]
      },
      "journal": {
        "sections": [
          { "type": "journal_list", "props": { "limit": 12 } }
        ]
      },
      "about": {
        "sections": [
          { "type": "story", "props": { "title": "Our Story", "body": "We make beautiful things." } },
          { "type": "values", "props": { "items": ["Sustainability", "Transparency", "Quality"] } }
        ]
      },
      "contact": {
        "sections": [
          { "type": "contact_form", "props": { "email": "hello@store.in", "phone": "+91 99999 99999" } }
        ]
      },
      "account": {
        "sections": [
          { "type": "account_panel", "props": { "tabs": ["orders", "addresses", "wishlist", "profile"] } }
        ]
      }
    }
  }'
)
ON CONFLICT (theme_id, version) DO NOTHING;


-- 2c. Seed Flowbite Corporate Manifest
INSERT INTO public.theme_master_versions (theme_id, version, files_manifest)
VALUES (
  'flowbite-corporate',
  1,
  '{
    "version": 2,
    "kind": "product",
    "dna": {
      "name": "Flowbite Corporate",
      "tagline": "Elegant, high-contrast corporate layout",
      "vibe": "corporate elegant clean structural",
      "radius": "4px",
      "palette": {
        "primary": "#1f2937",
        "primary_fg": "#ffffff",
        "accent": "#2563eb",
        "bg": "#ffffff",
        "surface": "#f9fafb",
        "fg": "#111827",
        "muted": "#4b5563",
        "border": "#d1d5db"
      },
      "fonts": {
        "heading": "Outfit",
        "body": "Plus Jakarta Sans",
        "heading_weight": 700
      }
    },
    "layout": {
      "header_style": "bold_bar",
      "density": "compact"
    },
    "hero_image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60",
    "pages": {
      "home": {
        "sections": [
          {
            "type": "hero",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"relative bg-gray-950 text-white py-24 px-6 overflow-hidden border-b-4 border-blue-600\"><div class=\"container mx-auto flex flex-col md:flex-row items-center justify-between gap-12 max-w-5xl\"><div class=\"flex-1 text-left space-y-6\"><h1 class=\"text-4xl font-extrabold tracking-tight text-white sm:text-5xl\">High-performance Retail Architecture</h1><p class=\"text-gray-400 text-sm leading-relaxed max-w-lg\">Empower your business with structured collections, custom specifications, and instant payment handovers designed for Indian merchants.</p><div class=\"flex items-center gap-3\"><button class=\"px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded shadow transition-all\">Shop Storefront</button><button class=\"px-6 py-2.5 bg-transparent border border-gray-700 hover:bg-gray-800 text-white font-semibold text-sm rounded transition-all\">Request Quote</button></div></div><div class=\"flex-1\"><img class=\"rounded shadow-2xl border border-gray-800\" src=\"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60\"></div></div></section>"
            }
          },
          {
            "type": "usp_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"bg-gray-100 border-b border-gray-300\"><div class=\"container px-6 py-6 mx-auto\"><div class=\"grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto divide-y md:divide-y-0 md:divide-x divide-gray-300 text-gray-700\"><div class=\"flex items-center gap-3 justify-center md:px-4 py-2 md:py-0\"><span class=\"text-blue-600 font-bold text-lg\">⚡</span><span class=\"text-xs font-bold uppercase tracking-wider\">B2B Wholesale Shipping</span></div><div class=\"flex items-center gap-3 justify-center md:px-4 py-2 md:py-0\"><span class=\"text-blue-600 font-bold text-lg\">🔒</span><span class=\"text-xs font-bold uppercase tracking-wider\">ISO Certified Security</span></div><div class=\"flex items-center gap-3 justify-center md:px-4 py-2 md:py-0\"><span class=\"text-blue-600 font-bold text-lg\">📦</span><span class=\"text-xs font-bold uppercase tracking-wider\">Bulk Volume Discounts</span></div></div></div></section>"
            }
          },
          {
            "type": "category_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-white\"><div class=\"container px-6 mx-auto max-w-4xl\"><div class=\"border-l-4 border-blue-600 pl-4 mb-10 text-left\"><h1 class=\"text-2xl font-bold tracking-tight text-gray-900\">Product Divisions</h1><p class=\"text-gray-500 text-xs mt-1\">Standard B2B industrial & consumer categories</p></div><div class=\"grid grid-cols-1 sm:grid-cols-3 gap-4\"><div class=\"p-6 rounded border bg-gray-50 hover:bg-gray-100 cursor-pointer transition\"><h3 class=\"font-bold text-gray-900 text-sm\">⚙️ Hardware</h3><p class=\"text-[11px] text-gray-500 mt-2\">Precision machinery, tools and building structural hardware.</p></div><div class=\"p-6 rounded border bg-gray-50 hover:bg-gray-100 cursor-pointer transition\"><h3 class=\"font-bold text-gray-900 text-sm\">🔌 Electronics</h3><p class=\"text-[11px] text-gray-500 mt-2\">Industrial electrical fittings, switchgear and custom cables.</p></div><div class=\"p-6 rounded border bg-gray-50 hover:bg-gray-100 cursor-pointer transition\"><h3 class=\"font-bold text-gray-900 text-sm\">🪵 Raw Materials</h3><p class=\"text-[11px] text-gray-500 mt-2\">Processed timber, metallic sheets and industrial chemicals.</p></div></div></div></section>"
            }
          },
          {
            "type": "product_grid",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-gray-50 border-t border-b\"><div class=\"container px-6 mx-auto max-w-5xl\"><div class=\"border-l-4 border-blue-600 pl-4 mb-10 text-left\"><h1 class=\"text-2xl font-bold tracking-tight text-gray-900\">Featured Catalogue</h1><p class=\"text-gray-500 text-xs mt-1\">Direct factory-sourced items</p></div><div class=\"grid grid-cols-2 md:grid-cols-4 gap-4\"><div class=\"rounded border bg-white overflow-hidden hover:shadow-md transition flex flex-col h-full\"><img class=\"object-cover w-full h-40\" src=\"https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=60\"><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-gray-900 truncate\">Steel Ball Bearings (Set of 10)</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-semibold text-gray-900\">₹1,450</span><span class=\"text-[10px] text-blue-600 font-semibold\">In Stock</span></div></div></div><div class=\"rounded border bg-white overflow-hidden hover:shadow-md transition flex flex-col h-full\"><img class=\"object-cover w-full h-40\" src=\"https://images.unsplash.com/photo-1590986424791-2355385d0442?w=400&auto=format&fit=crop&q=60\"><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-gray-900 truncate\">Industrial Extension Cord 15m</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-semibold text-gray-900\">₹2,899</span><span class=\"text-[10px] text-blue-600 font-semibold\">In Stock</span></div></div></div><div class=\"rounded border bg-white overflow-hidden hover:shadow-md transition flex flex-col h-full\"><img class=\"object-cover w-full h-40\" src=\"https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop&q=60\"><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-gray-900 truncate\">LED Floodlight 100W</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-semibold text-gray-900\">₹1,999</span><span class=\"text-[10px] text-blue-600 font-semibold\">In Stock</span></div></div></div><div class=\"rounded border bg-white overflow-hidden hover:shadow-md transition flex flex-col h-full\"><img class=\"object-cover w-full h-40\" src=\"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop&q=60\"><div class=\"p-4 flex flex-col justify-between flex-1\"><h3 class=\"text-xs font-bold text-gray-900 truncate\">Pressure Valve Regulator</h3><div class=\"flex items-center justify-between mt-3\"><span class=\"text-sm font-semibold text-gray-900\">₹3,400</span><span class=\"text-[10px] text-red-500 font-semibold\">Low Stock</span></div></div></div></div></div></section>"
            }
          },
          {
            "type": "story",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-white\"><div class=\"container px-6 mx-auto flex flex-col md:flex-row items-center gap-12 max-w-5xl\"><div class=\"flex-1 text-left space-y-4\"><h2 class=\"text-3xl font-extrabold tracking-tight text-gray-900\">Engineered to Perfection</h2><p class=\"text-gray-600 text-sm leading-relaxed\">Our manufacturing pipeline employs advanced machinery and automation to guarantee tolerances within 0.01mm. We provide certified raw material records and mechanical drawings with every industrial purchase order.</p><button class=\"px-6 py-2 bg-blue-600 text-white font-semibold text-sm rounded shadow hover:bg-blue-700 transition\">Download ISO Certificate</button></div><div class=\"flex-1\"><img class=\"rounded border shadow-md\" src=\"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60\"></div></div></section>"
            }
          },
          {
            "type": "journal_strip",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"py-16 bg-gray-50 border-t\"><div class=\"container px-6 mx-auto max-w-4xl\"><div class=\"text-center mb-10\"><h1 class=\"text-2xl font-bold tracking-tight text-gray-900\">Corporate Briefings</h1><p class=\"text-gray-500 text-xs mt-1\">Technical insights and engineering whitepapers</p></div><div class=\"grid md:grid-cols-2 gap-6\"><div class=\"p-6 rounded border bg-white shadow-sm\"><span class=\"text-xs text-blue-600 font-bold uppercase tracking-wider\">Technical Brief</span><h3 class=\"text-sm font-bold text-gray-900 mt-2\">Optimising Valve Life in High-Pressure Loops</h3><p class=\"text-xs text-gray-500 mt-2 leading-relaxed\">An analysis of temperature coefficients and alloy structures to prevent early valve leakage failures.</p></div><div class=\"p-6 rounded border bg-white shadow-sm\"><span class=\"text-xs text-blue-600 font-bold uppercase tracking-wider\">Whitepaper</span><h3 class=\"text-sm font-bold text-gray-900 mt-2\">Supply Chain Resiliency in Indian B2B Retail</h3><p class=\"text-xs text-gray-500 mt-2 leading-relaxed\">Strategic mapping of logistics routes to ensure part deliveries remain uninterrupted during monsoon.</p></div></div></div></section>"
            }
          },
          {
            "type": "newsletter",
            "props": {
              "is_custom_html": true,
              "html": "<section class=\"bg-gray-900 text-white py-16 px-6 border-t border-gray-800\"><div class=\"container mx-auto flex flex-col md:flex-row justify-between items-center gap-6 max-w-5xl\"><div class=\"text-left\"><h2 class=\"text-xl font-bold\">Join the Industrial Mailing List</h2><p class=\"text-xs text-gray-400 mt-1\">Receive our monthly parts catalog and volume discount announcements.</p></div><div class=\"flex items-center gap-2 w-full md:w-auto\"><input type=\"text\" placeholder=\"corporate@domain.com\" class=\"px-4 py-2 rounded text-gray-950 outline-none text-sm w-full md:w-64 border border-gray-800\"><button class=\"px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded whitespace-nowrap shadow-md transition-all\">Subscribe</button></div></div></section>"
            }
          }
        ]
      },
      "auth": {
        "sections": [
          { "type": "signup", "props": { "title": "Create your corporate account", "cta": "Sign up" } },
          { "type": "signin", "props": { "title": "Welcome back, sign in", "cta": "Sign in" } },
          { "type": "forgot_password", "props": { "title": "Reset password", "cta": "Send link" } },
          { "type": "reset_password", "props": { "title": "Choose new password", "cta": "Update password" } }
        ]
      },
      "shop": {
        "sections": [
          { "type": "product_grid", "props": { "title": "Industrial Catalog", "items": [] } }
        ]
      },
      "product": {
        "sections": [
          { "type": "product_detail", "props": {} }
        ]
      },
      "cart": {
        "sections": [
          { "type": "line_items", "props": {} },
          { "type": "cart_summary", "props": { "cta": "Checkout" } }
        ]
      },
      "checkout": {
        "sections": [
          { "type": "checkout_stepper", "props": { "steps": ["address", "shipping", "payment", "review"] } }
        ]
      },
      "journal": {
        "sections": [
          { "type": "journal_list", "props": { "limit": 12 } }
        ]
      },
      "about": {
        "sections": [
          { "type": "story", "props": { "title": "Our Story", "body": "We make beautiful things." } },
          { "type": "values", "props": { "items": ["Sustainability", "Transparency", "Quality"] } }
        ]
      },
      "contact": {
        "sections": [
          { "type": "contact_form", "props": { "email": "hello@store.in", "phone": "+91 99999 99999" } }
        ]
      },
      "account": {
        "sections": [
          { "type": "account_panel", "props": { "tabs": ["orders", "addresses", "wishlist", "profile"] } }
        ]
      }
    }
  }'
)
ON CONFLICT (theme_id, version) DO NOTHING;
