import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Blueprint defaults for deterministic assembly when no DB blueprints exist ──
const FALLBACK_BLUEPRINTS: Record<string, any> = {
  announcement_bar: { type: "announcement_bar", layout: "full-width", height: "small", animation: "fade-in", announcementText: "🎉 Free shipping on orders over ₹999 — Limited time offer!", margins: { top: 0, bottom: 0 }, padding: { x: 16, y: 8 } },
  testimonials: { type: "testimonials", layout: "grid-3", animation: "stagger-children", title: "What Our Customers Say", testimonials: [
    { name: "Priya S.", rating: 5, quote: "Absolutely love the quality! Will order again.", avatar: "🌸" },
    { name: "Rahul M.", rating: 5, quote: "Fast delivery and amazing packaging. 10/10!", avatar: "⭐" },
    { name: "Ananya K.", rating: 4, quote: "Great product, exactly as described. Very happy.", avatar: "💎" },
    { name: "Vikram P.", rating: 5, quote: "Best purchase I've made this year. Highly recommend!", avatar: "🔥" },
  ], margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  trust_badges: { type: "trust_badges", layout: "grid-4", animation: "fade-in", title: "Why Shop With Us", trustBadges: [
    { icon: "🚚", label: "Free Shipping" }, { icon: "🔒", label: "Secure Payment" },
    { icon: "↩️", label: "Easy Returns" }, { icon: "💬", label: "24/7 Support" },
    { icon: "✅", label: "Quality Assured" }, { icon: "📦", label: "Fast Dispatch" },
  ], margins: { top: 16, bottom: 16 }, padding: { x: 16, y: 16 } },
  brand_marquee: { type: "brand_marquee", layout: "full-width", animation: "fade-in", title: "Trusted By Leading Brands", brands: ["Nike", "Adidas", "Puma", "Reebok", "Under Armour", "New Balance", "Fila", "Skechers"], margins: { top: 16, bottom: 16 }, padding: { x: 0, y: 12 } },
  countdown_timer: { type: "countdown_timer", layout: "full-width", animation: "scale-in", title: "Flash Sale Ends In", subtitle: "Don't miss out on exclusive deals!", countdownDate: new Date(Date.now() + 7 * 86400000).toISOString(), margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  image_with_text: { type: "image_with_text", layout: "split-50-50", animation: "slide-in-left", title: "Crafted With Care", subtitle: "Every product is handpicked and quality-tested to ensure you get the very best.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  instagram_feed: { type: "instagram_feed", layout: "grid-4", animation: "stagger-children", title: "Follow Us @storename", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 16 } },
  collection_showcase: { type: "collection_showcase", layout: "grid-3", animation: "slide-up", title: "Shop By Collection", subtitle: "Explore our curated collections", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  newsletter: { type: "newsletter", layout: "full-width", animation: "fade-in", title: "Stay In The Loop", subtitle: "Subscribe for exclusive offers, new arrivals, and insider-only discounts.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  hero: { type: "hero", layout: "full-width", animation: "fade-in", height: "large", title: "Discover Your Style", subtitle: "Premium quality products at prices you'll love.", margins: { top: 0, bottom: 0 }, padding: { x: 16, y: 32 } },
  featured_products: { type: "featured_products", layout: "grid-4", animation: "stagger-children", title: "Best Sellers", subtitle: "Our most loved products", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  category_grid: { type: "category_grid", layout: "grid-3", animation: "slide-up", title: "Shop By Category", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  text_block: { type: "text_block", layout: "full-width", animation: "fade-in", title: "Our Story", subtitle: "We believe in quality, sustainability, and making every customer smile.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  banner_carousel: { type: "banner_carousel", layout: "full-width", animation: "fade-in", title: "New Arrivals", height: "medium", margins: { top: 0, bottom: 16 }, padding: { x: 0, y: 0 } },
  video_hero: { type: "video_hero", layout: "full-width", animation: "fade-in", title: "See It In Action", height: "large", margins: { top: 0, bottom: 0 }, padding: { x: 0, y: 0 } },
};

// ── Animation mapping by intensity ──
const ANIMATION_POOLS = {
  subtle: ["fade-in", "slide-up", "blur-in"],
  moderate: ["fade-in", "slide-up", "slide-in-left", "slide-in-right", "scale-in", "blur-in"],
  dramatic: ["parallax", "ken-burns", "stagger-children", "flip-up", "bounce-in", "slide-in-left", "slide-in-right"],
};

const CARD_EFFECT_MAP: Record<string, string> = {
  "Glare": "hover-glare", "Tilt 3D": "hover-tilt", "Lift Shadow": "hover-lift",
  "Border Glow": "hover-border-glow", "Zoom Image": "hover-zoom-image",
};

const HERO_ANIMATION_MAP: Record<string, string> = {
  "Parallax": "parallax", "Ken Burns Zoom": "ken-burns", "Video Background": "fade-in",
  "Split Layout": "slide-in-left", "Full Bleed": "scale-in",
};

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArray<T>(arr: T[]): T[] { return [...arr].sort(() => 0.5 - Math.random()); }

// ── Deterministic multi-page generation (zero AI cost) ──
function generateAllPages(themeName: string, category: string) {
  const storeName = `${themeName} Store`;

  const shop = {
    layout: "grid-4",
    title: "All Products",
    filters: ["Category", "Price", "Rating", "Availability"],
    sorting: ["Newest", "Price: Low to High", "Price: High to Low", "Popularity"],
    productsPerPage: 12,
  };

  const about = {
    sections: [
      { type: "hero_banner", title: `About ${storeName}`, subtitle: "Our story, our passion, our commitment to you." },
      { type: "story", title: "Our Story", content: `Welcome to ${storeName}. We started with a simple belief — everyone deserves access to premium quality products at honest prices. What began as a small passion project has grown into a brand trusted by thousands of happy customers across India.\n\nEvery product in our store is carefully curated, tested, and approved before it reaches you. We work directly with artisans and manufacturers who share our commitment to quality and sustainability.` },
      { type: "mission", title: "Our Mission", content: "To deliver exceptional products with uncompromising quality, transparent pricing, and an unforgettable shopping experience. We believe in building lasting relationships with our customers — not just transactions." },
      { type: "values", title: "What We Stand For", values: [
        { icon: "✨", title: "Quality First", description: "Every product passes our rigorous quality checks before reaching you." },
        { icon: "💚", title: "Sustainability", description: "We're committed to eco-friendly packaging and ethical sourcing." },
        { icon: "🤝", title: "Customer Love", description: "Your satisfaction is our top priority. Always." },
        { icon: "🚀", title: "Innovation", description: "We continuously evolve to bring you the latest and best." },
      ]},
      { type: "team", title: "Meet Our Team", subtitle: "The passionate people behind the brand." },
    ],
  };

  const contact = {
    title: "Get In Touch",
    subtitle: "We'd love to hear from you. Reach out anytime!",
    fields: ["Name", "Email", "Phone", "Subject", "Message"],
    info: [
      { icon: "📧", label: "Email", value: `hello@${category}store.com` },
      { icon: "📱", label: "Phone", value: "+91 98765 43210" },
      { icon: "📍", label: "Address", value: "123 Commerce Street, Mumbai, Maharashtra 400001" },
      { icon: "🕐", label: "Hours", value: "Mon-Sat: 10am - 7pm IST" },
    ],
  };

  const faq = {
    title: "Frequently Asked Questions",
    subtitle: "Find answers to the most common questions about our store.",
    items: [
      { q: "How long does delivery take?", a: "Standard delivery takes 3-7 business days across India. Express delivery (1-3 days) is available for select pincodes at an additional charge." },
      { q: "What payment methods do you accept?", a: "We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD). All online payments are processed securely through Razorpay." },
      { q: "Can I return or exchange a product?", a: "Yes! We offer a 7-day easy return and exchange policy. Products must be unused and in original packaging. Refunds are processed within 5-7 business days." },
      { q: "Do you offer free shipping?", a: "Yes, we offer free shipping on all orders above ₹999. For orders below ₹999, a flat shipping fee of ₹49 applies." },
      { q: "How can I track my order?", a: "Once your order is shipped, you'll receive a tracking link via email and SMS. You can also track your order from your account dashboard." },
      { q: "Is Cash on Delivery available?", a: "Yes, COD is available for orders up to ₹5,000 across most serviceable pincodes in India." },
      { q: "How do I contact customer support?", a: "You can reach us via email, phone, or the Contact Us page. Our support team responds within 24 hours on business days." },
      { q: "Do you ship internationally?", a: "Currently, we ship only within India. International shipping is coming soon!" },
    ],
  };

  const privacyPolicy = {
    title: "Privacy Policy",
    lastUpdated: new Date().toISOString().split("T")[0],
    sections: [
      { heading: "Information We Collect", content: `At ${storeName}, we collect information you provide directly to us, including your name, email address, phone number, shipping address, and payment information when you make a purchase. We also automatically collect certain information about your device, including your IP address, browser type, and browsing patterns on our site.` },
      { heading: "How We Use Your Information", content: "We use the information we collect to: process and fulfill your orders, communicate with you about your orders and our products, improve and personalize your shopping experience, send promotional communications (with your consent), prevent fraud and ensure security, and comply with legal obligations." },
      { heading: "Information Sharing", content: "We do not sell, trade, or rent your personal information to third parties. We may share your information with: payment processors (Razorpay) to process transactions, shipping partners (Delhivery) to deliver your orders, and service providers who assist us in operating our website." },
      { heading: "Data Security", content: "We implement industry-standard security measures including SSL encryption, secure payment processing, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure." },
      { heading: "Cookies", content: "We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences." },
      { heading: "Your Rights", content: "You have the right to: access, update, or delete your personal information, opt out of marketing communications, request a copy of your data, and lodge a complaint with a data protection authority." },
      { heading: "Contact Us", content: `If you have questions about this Privacy Policy, please contact us at privacy@${category}store.com or through our Contact Us page.` },
    ],
  };

  const returnPolicy = {
    title: "Return & Refund Policy",
    lastUpdated: new Date().toISOString().split("T")[0],
    sections: [
      { heading: "Return Window", content: "We offer a 7-day return window from the date of delivery. To be eligible for a return, the item must be unused, in its original packaging, and in the same condition as received." },
      { heading: "How to Initiate a Return", content: "To initiate a return: 1) Log in to your account and go to 'My Orders', 2) Select the order and click 'Return', 3) Choose your reason for return, 4) Our team will arrange a pickup within 2-3 business days." },
      { heading: "Refund Process", content: "Once we receive and inspect the returned item, we'll notify you via email. If approved, your refund will be processed within 5-7 business days to your original payment method. For COD orders, refunds will be credited to your bank account." },
      { heading: "Exchange Policy", content: "We offer free exchanges for size or color variations, subject to availability. Exchange requests follow the same 7-day window and process as returns." },
      { heading: "Non-Returnable Items", content: "The following items cannot be returned: personalized or customized products, intimate wear and undergarments, items marked as 'Final Sale', and products with broken seals (for hygiene products)." },
      { heading: "Damaged or Defective Items", content: "If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos. We'll arrange a free replacement or full refund immediately." },
    ],
  };

  const terms = {
    title: "Terms of Service",
    lastUpdated: new Date().toISOString().split("T")[0],
    sections: [
      { heading: "Acceptance of Terms", content: `By accessing and using ${storeName}'s website, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.` },
      { heading: "Products and Pricing", content: "All product descriptions, images, and prices are provided in good faith. We reserve the right to modify prices without prior notice. Prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise." },
      { heading: "Orders and Payment", content: "By placing an order, you agree to provide accurate and complete information. We reserve the right to cancel orders due to pricing errors, stock unavailability, or suspected fraud. Payment must be completed at the time of order unless Cash on Delivery is selected." },
      { heading: "Shipping and Delivery", content: "We aim to deliver within the estimated timeframe but cannot guarantee exact delivery dates. Risk of loss transfers to you upon delivery. We are not responsible for delays caused by shipping carriers or force majeure events." },
      { heading: "Intellectual Property", content: `All content on this website, including text, images, logos, and designs, is the property of ${storeName} and protected by Indian copyright and trademark laws. Unauthorized use is prohibited.` },
      { heading: "Limitation of Liability", content: `${storeName} shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our total liability shall not exceed the amount paid for the specific product in question.` },
      { heading: "Governing Law", content: "These terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra." },
    ],
  };

  const shippingPolicy = {
    title: "Shipping Policy",
    lastUpdated: new Date().toISOString().split("T")[0],
    sections: [
      { heading: "Shipping Coverage", content: "We currently ship across India to all major cities and most pin codes. Enter your pin code on the product page to check serviceability in your area." },
      { heading: "Shipping Rates", content: "Free shipping on all orders above ₹999. For orders below ₹999, a flat shipping charge of ₹49 applies. Express shipping is available at ₹149 for select pin codes." },
      { heading: "Delivery Timeframes", content: "Standard Delivery: 3-7 business days. Express Delivery: 1-3 business days. Metro cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata): 2-4 business days. Remote areas may take 7-10 business days." },
      { heading: "Order Processing", content: "Orders placed before 2 PM IST on business days are processed the same day. Orders placed after 2 PM or on weekends/holidays are processed the next business day." },
      { heading: "Order Tracking", content: "Once your order is shipped, you'll receive a tracking number via email and SMS. You can track your order in real-time through your account dashboard or the courier partner's website." },
      { heading: "Undelivered Orders", content: "If a delivery attempt fails, our courier partner will make up to 3 attempts. If the order remains undelivered, it will be returned to us and a refund will be initiated." },
    ],
  };

  return { shop, about, contact, faq, privacy_policy: privacyPolicy, return_policy: returnPolicy, terms, shipping_policy: shippingPolicy };
}

// ── Standard footer for generated themes ──
function generateFooter(themeName: string) {
  return {
    columns: [
      { title: "Quick Links", links: [
        { label: "Shop", href: "/shop" }, { label: "New Arrivals", href: "/shop?sort=newest" },
        { label: "Best Sellers", href: "/shop?sort=popular" }, { label: "About Us", href: "/about" },
      ]},
      { title: "Customer Support", links: [
        { label: "Contact Us", href: "/contact" }, { label: "FAQ", href: "/faq" },
        { label: "Shipping Info", href: "/shipping-policy" }, { label: "Track Order", href: "/account" },
      ]},
      { title: "Legal", links: [
        { label: "Privacy Policy", href: "/privacy-policy" }, { label: "Return Policy", href: "/return-policy" },
        { label: "Terms of Service", href: "/terms" }, { label: "Shipping Policy", href: "/shipping-policy" },
      ]},
    ],
    copyright: `© ${new Date().getFullYear()} ${themeName} Store. All rights reserved.`,
    social_links: { instagram: "#", facebook: "#", twitter: "#" },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { category, styleHints } = await req.json();
    if (!category) throw new Error("Category is required");

    const parsedHints = parseStyleHints(styleHints || "");

    // ── TIER 1: Lightweight AI call for Design DNA only ──
    const designDnaPrompt = `You are a world-class e-commerce brand designer. Generate ONLY the brand identity for a "${category}" store theme.
${styleHints ? `\nDesign brief: ${styleHints}` : ""}

Return ONLY the design DNA — no section content, no testimonials, no badge text.`;

    const dnaRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: designDnaPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_design_dna",
            description: "Create brand identity for an e-commerce theme — colors, fonts, name only",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Theme name like 'Luxe Fashion' or 'Organic Bites'" },
                description: { type: "string", description: "Marketing copy (2-3 sentences)" },
                colors: {
                  type: "object",
                  properties: {
                    primary: { type: "string" }, secondary: { type: "string" }, accent: { type: "string" },
                    background: { type: "string" }, text: { type: "string" }, card: { type: "string" },
                  },
                  required: ["primary", "secondary", "accent", "background", "text", "card"],
                },
                fonts: {
                  type: "object",
                  properties: {
                    heading: { type: "string", description: "Distinctive Google Font for headings" },
                    body: { type: "string", description: "Clean Google Font for body" },
                  },
                  required: ["heading", "body"],
                },
                borderRadius: { type: "number" },
                gradientBackground: { type: "string", description: "Optional CSS gradient for hero" },
                section_order: {
                  type: "array",
                  items: { type: "string", enum: ["hero", "featured_products", "category_grid", "text_block", "newsletter", "banner_carousel", "testimonials", "countdown_timer", "trust_badges", "brand_marquee", "image_with_text", "video_hero", "instagram_feed", "collection_showcase", "announcement_bar"] },
                  description: "Ordered list of 8-12 section types for the home page. First should be announcement_bar, second should be hero.",
                },
                image_prompts: {
                  type: "array",
                  items: { type: "object", properties: { section: { type: "string" }, prompt: { type: "string" } }, required: ["section", "prompt"] },
                  description: "4-6 image prompts for hero and key sections. Use section types like 'hero', 'image_with_text', etc.",
                },
              },
              required: ["name", "description", "colors", "fonts", "borderRadius", "section_order", "image_prompts"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_design_dna" } },
      }),
    });

    if (!dnaRes.ok) {
      const errText = await dnaRes.text();
      console.error("AI DNA error:", dnaRes.status, errText);
      if (dnaRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (dnaRes.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const dnaData = await dnaRes.json();
    const toolCall = dnaData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const designDna = JSON.parse(toolCall.function.arguments);
    const dnaTokens = dnaData.usage?.total_tokens || 1000;

    // ── TIER 2: Deterministic Assembly from blueprints ──
    const { data: dbBlueprints } = await adminClient
      .from("theme_section_blueprints")
      .select("*")
      .or(`category_tags.cs.{${category}},category_tags.cs.{general}`);

    const blueprintLookup: Record<string, any[]> = {};
    for (const bp of (dbBlueprints || [])) {
      if (!blueprintLookup[bp.section_type]) blueprintLookup[bp.section_type] = [];
      blueprintLookup[bp.section_type].push(bp.content_json);
    }

    const intensity = parsedHints.animationIntensity;
    const animPool = intensity > 70 ? ANIMATION_POOLS.dramatic : intensity > 40 ? ANIMATION_POOLS.moderate : ANIMATION_POOLS.subtle;

    const cardEffects = parsedHints.cardEffects.map((e: string) => CARD_EFFECT_MAP[e]).filter(Boolean);
    const defaultCardEffect = cardEffects.length > 0 ? cardEffects[0] : "hover-lift";

    const sectionOrder = designDna.section_order || ["announcement_bar", "hero", "featured_products", "category_grid", "testimonials", "trust_badges", "newsletter"];
    const homeSections: any[] = [];

    for (const sectionType of sectionOrder) {
      const variants = blueprintLookup[sectionType];
      let section = variants && variants.length > 0
        ? JSON.parse(JSON.stringify(pickRandom(variants)))
        : JSON.parse(JSON.stringify(FALLBACK_BLUEPRINTS[sectionType] || { type: sectionType, layout: "full-width", title: sectionType.replace(/_/g, " ") }));

      section.type = sectionType;

      if (sectionType === "hero") {
        section.animation = HERO_ANIMATION_MAP[parsedHints.heroStyle] || pickRandom(animPool);
      } else {
        section.animation = pickRandom(animPool);
      }

      if (["featured_products", "category_grid", "collection_showcase"].includes(sectionType)) {
        section.cardEffect = cardEffects.length > 0 ? pickRandom(cardEffects) : defaultCardEffect;
      }

      homeSections.push(section);
    }

    // ── Image Pool lookup + parallel generation ──
    const imagePrompts = designDna.image_prompts || [];
    const generatedImages: Record<string, string> = {};

    const { data: poolImages } = await adminClient
      .from("theme_image_pool")
      .select("*")
      .eq("category", category);

    const poolBySection: Record<string, string[]> = {};
    for (const img of (poolImages || [])) {
      if (!poolBySection[img.section_type]) poolBySection[img.section_type] = [];
      poolBySection[img.section_type].push(img.image_url);
    }

    const promptsToGenerate: typeof imagePrompts = [];
    for (const imgReq of imagePrompts.slice(0, 5)) {
      const poolForSection = poolBySection[imgReq.section];
      if (poolForSection && poolForSection.length >= 3) {
        generatedImages[imgReq.section] = pickRandom(poolForSection);
      } else {
        promptsToGenerate.push(imgReq);
      }
    }

    let imageTokens = 0;
    const generateImage = async (imgReq: { section: string; prompt: string }) => {
      try {
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: imgReq.prompt + ". High quality, professional e-commerce photography style, 16:9 aspect ratio." }],
            modalities: ["image", "text"],
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const base64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64) {
            const raw = base64.includes(",") ? base64.split(",")[1] : base64;
            const imageBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
            const path = `themes/${crypto.randomUUID()}.png`;
            const { error: uploadErr } = await adminClient.storage.from("product-images").upload(path, imageBytes, { contentType: "image/png" });
            if (!uploadErr) {
              const { data: { publicUrl } } = adminClient.storage.from("product-images").getPublicUrl(path);
              generatedImages[imgReq.section] = publicUrl;

              await adminClient.from("theme_image_pool").insert({
                category,
                section_type: imgReq.section,
                image_url: publicUrl,
              });
            }
          }
          imageTokens += imgData.usage?.total_tokens || 1000;
        }
      } catch (e) {
        console.error("Image gen error:", e);
      }
    };

    for (let i = 0; i < promptsToGenerate.length; i += 3) {
      const batch = promptsToGenerate.slice(i, i + 3);
      await Promise.all(batch.map(generateImage));
    }

    // ── FIX: Assign images using the SAME keys the AI returns (e.g. "hero", not "home_hero") ──
    for (const section of homeSections) {
      // Try direct match first (AI returns "hero", "image_with_text", etc.)
      if (generatedImages[section.type]) {
        section.image = generatedImages[section.type];
      }
      // Also check with prefix for backward compatibility
      const prefixKey = `home_${section.type}`;
      if (!section.image && generatedImages[prefixKey]) {
        section.image = generatedImages[prefixKey];
      }
    }

    // Save blueprints for future reuse
    const blueprintInserts = homeSections
      .filter(s => !blueprintLookup[s.type] || blueprintLookup[s.type].length < 5)
      .map(s => ({
        section_type: s.type,
        layout: s.layout || "full-width",
        variant_name: `${designDna.name} - ${s.type}`,
        content_json: s,
        category_tags: [category, "general"],
      }));

    if (blueprintInserts.length > 0) {
      await adminClient.from("theme_section_blueprints").insert(blueprintInserts);
    }

    // ── Generate all other pages deterministically (zero AI cost) ──
    const otherPages = generateAllPages(designDna.name, category);
    const footer = generateFooter(designDna.name);

    // ── Calculate cost ──
    const textCost = (dnaTokens / 1000) * 0.05;
    const newImagesCount = promptsToGenerate.length;
    const imageCost = newImagesCount * 3.5;
    const totalCostInr = Math.round((textCost + imageCost) * 100) / 100;
    const poolReused = imagePrompts.length - newImagesCount;

    // Thumbnail: use hero image or first available
    const thumbnail = generatedImages["hero"] || generatedImages["home_hero"] || Object.values(generatedImages)[0] || null;

    const { data: pack, error: insertErr } = await adminClient.from("theme_packs").insert({
      name: designDna.name,
      category,
      description: designDna.description,
      thumbnail,
      pages: { home: homeSections, ...otherPages },
      theme_config: {
        colors: designDna.colors,
        fonts: designDna.fonts,
        borderRadius: designDna.borderRadius,
        gradientBackground: designDna.gradientBackground,
        footer,
      },
      price: 499,
      ai_generation_cost: totalCostInr,
      is_published: false,
      created_by: user.id,
    }).select().single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      theme_pack: pack,
      images_generated: newImagesCount,
      images_reused: poolReused,
      cost: totalCostInr,
      pages_generated: Object.keys({ home: true, ...otherPages }).length,
      optimization: poolReused > 0 ? `Saved ₹${(poolReused * 3.5).toFixed(2)} by reusing ${poolReused} cached images` : "First generation for this category — images cached for next time",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-theme-pack error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseStyleHints(hints: string) {
  const result = {
    mood: "Bold",
    animationIntensity: 65,
    cardEffects: [] as string[],
    heroStyle: "Full Bleed",
    colorMood: "Vibrant",
    typoFeel: "Modern Sans",
    sections: [] as string[],
  };

  if (!hints) return result;

  const match = (key: string) => {
    const regex = new RegExp(`${key}:\\s*([^.]+)`, "i");
    const m = hints.match(regex);
    return m ? m[1].trim() : null;
  };

  result.mood = match("Mood") || result.mood;
  const intensityStr = match("Animation Intensity");
  if (intensityStr) result.animationIntensity = parseInt(intensityStr) || 65;
  const cardsStr = match("Card Effects");
  if (cardsStr) result.cardEffects = cardsStr.split(",").map(s => s.trim()).filter(Boolean);
  result.heroStyle = match("Hero Style") || result.heroStyle;
  result.colorMood = match("Color Mood") || result.colorMood;
  result.typoFeel = match("Typography") || result.typoFeel;
  const sectionsStr = match("Include Sections");
  if (sectionsStr) result.sections = sectionsStr.split(",").map(s => s.trim()).filter(Boolean);

  return result;
}
