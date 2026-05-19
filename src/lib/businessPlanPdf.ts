import jsPDF from 'jspdf';
import { picToCartLogoSrc } from '@/components/PicToCartLogo';

const BRAND = {
  primary: [124, 58, 237] as [number, number, number],   // violet-600
  accent: [217, 70, 239] as [number, number, number],    // fuchsia-500
  ink: [15, 23, 42] as [number, number, number],         // slate-900
  muted: [100, 116, 139] as [number, number, number],    // slate-500
  bgSoft: [248, 250, 252] as [number, number, number],   // slate-50
};

const PAGE = { w: 210, h: 297, m: 18 };

async function loadLogoDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = picToCartLogoSrc;
  });
}

interface Section {
  title: string;
  body: string[];
  bullets?: string[];
}

const PLAN: Section[] = [
  {
    title: '1. Executive Summary',
    body: [
      'Pic to Cart is India\'s AI-native (Artificial Intelligence-native) e-commerce Operating System (OS) purpose-built for the next 100 million Indian small sellers — the kirana store, the home baker, the karigar, the boutique owner, the Direct-to-Consumer (D2C) brand founder.',
      'Our promise: snap a single product photo, and within 5 minutes we generate a fully-branded online store — complete with descriptions, theme, payments, shipping, Search Engine Optimization (SEO) and a customer-ready storefront.',
      'We are seeking ₹3.5 Crore in seed funding for 12% equity to fuel an 18-month go-to-market sprint across India before expanding to the Middle East and North Africa (MENA), South-East Asia (SEA) and Latin America (LATAM) regions.',
    ],
  },
  {
    title: '2. The Problem',
    body: [
      'India has over 63 million Micro, Small and Medium Enterprises (MSMEs). Less than 5% sell online today. The reasons are stark:',
    ],
    bullets: [
      'Shopify and similar global platforms cost ₹2,000+ per month and assume English-first, designer-grade content.',
      'Marketplaces (Amazon, Flipkart, Meesho) demand 20–30% commissions, hide customer data, and prevent brand-building.',
      'WhatsApp / Do-It-Yourself (DIY) commerce lacks payments, tracking, analytics, and order management.',
      'Tier-2 and Tier-3 sellers struggle with product photography, copywriting, theme design and Goods and Services Tax (GST) compliance.',
    ],
  },
  {
    title: '3. The Solution',
    body: [
      'Pic to Cart compresses what used to take a 6-week web agency engagement into a 5-minute, mobile-first onboarding. Powered by Google Gemini Large Language Models (LLMs) routed through the Lovable Artificial Intelligence (AI) Gateway, we generate everything a seller needs:',
    ],
    bullets: [
      'AI-written product titles, descriptions, Search Engine Optimization (SEO) metadata, and tags.',
      'AI-generated themes, blog posts, store policies, and email templates.',
      'Pincode-aware shipping integration with Shiprocket (17+ couriers, 29,000+ pincodes).',
      'One-page checkout with Razorpay, Cash on Delivery (COD) and Unified Payments Interface (UPI).',
      'Custom Domain Name System (DNS) management and white-label transactional emails.',
    ],
  },
  {
    title: '4. Market Opportunity',
    body: [
      'Total Addressable Market (TAM): $350 Billion — projected Indian e-commerce by 2030.',
      'Serviceable Addressable Market (SAM): $45 Billion — Small and Medium Business (SMB) commerce Software-as-a-Service (SaaS) in India.',
      'Serviceable Obtainable Market (SOM): $2.4 Billion — reachable in 24 months across India and adjacent emerging markets.',
      'Tailwinds: Unified Payments Interface (UPI) at 14B+ monthly transactions; the Open Network for Digital Commerce (ONDC) unbundling marketplace monopolies; vernacular smartphone users crossing 700M; Generative AI making custom software 100x cheaper to deliver.',
    ],
  },
  {
    title: '5. Product & Technology',
    body: [
      'Built on a modern stack: React 18, Vite 5, Tailwind Cascading Style Sheets (CSS) v3, TypeScript 5, and a managed Supabase (Postgres + Edge Functions) backend deployed in the Asia-Pacific region.',
      'Core engineering investment so far: 1,800+ hours, 65+ production features, 30+ AI-generated themes, 4 sprints (Foundation, Operations, Growth, Engagement) shipped to production at pictocart.in.',
      'Key Application Programming Interface (API) integrations: Razorpay, Shiprocket, Resend (email), Web Push, and the Lovable AI Gateway for all generative workloads.',
    ],
  },
  {
    title: '6. Revenue Model',
    body: ['Seven compounding revenue streams that grow Average Revenue Per User (ARPU) over the seller lifetime:'],
    bullets: [
      'Subscriptions: Free / Starter ₹499 / Growth ₹1,499 / Scale ₹4,999 per month.',
      'Platform commission: 1–3% on Gross Merchandise Value (GMV) (tiered by plan).',
      'Premium themes: ₹500–2,000 one-time per AI-designed theme.',
      'AI Credits Wallet: pay-per-use for descriptions, images, blogs, theme generation.',
      'Custom domain registration & Domain Name System (DNS) management upsell.',
      'Payments float: branded checkout fees and Razorpay revenue share.',
      'Partner / Agency Network: 30% theme marketplace cut, ₹50K+ per agency Annual Contract Value (ACV).',
    ],
  },
  {
    title: '7. Go-To-Market Strategy',
    body: [
      'Phase 1 (Months 1–6) — Bharat Push: Vernacular User Interface (UI) launch in Hindi, Tamil, Telugu, Marathi. Performance marketing on Meta and YouTube Shorts. Open Network for Digital Commerce (ONDC) bridge. Target: 10,000 active sellers.',
      'Phase 2 (Months 7–12) — Scale & Polish: WhatsApp Commerce, Progressive Web App (PWA) → native mobile, abandoned cart automation, loyalty wallet. Target: 50,000 active sellers, ₹65 Lakh Monthly Recurring Revenue (MRR).',
      'Phase 3 (Months 13–18) — MENA & SEA: Multi-currency, multi-language storefront. Launch in United Arab Emirates (UAE), Kingdom of Saudi Arabia (KSA), Singapore, Indonesia. Stripe + local payment gateways.',
      'Phase 4 (Months 19–24) — Global SaaS: LATAM + Africa expansion. Series A round. 250,000 sellers globally. ₹6 Crore+ Monthly Recurring Revenue (MRR). Path to Initial Public Offering (IPO).',
    ],
  },
  {
    title: '8. Funding Ask & Use of Funds',
    body: [
      'Seeking ₹3.5 Crore (Indian Rupee) seed for 12% equity. Pre-money valuation: ₹25.7 Crore. 18-month runway. Path to Series A at ₹50 Crore valuation.',
    ],
    bullets: [
      'Marketing & Performance Ads — 40% (₹1.40 Cr).',
      'Sales & Onboarding Team (12 hires) — 25% (₹0.88 Cr).',
      'Product & AI Research and Development (R&D) — 15% (₹0.53 Cr).',
      'Infrastructure & AI Credits — 10% (₹0.35 Cr).',
      'Operations & Compliance — 10% (₹0.35 Cr).',
    ],
  },
  {
    title: '9. Financial Projections (18-month base case)',
    body: [
      'Active Sellers: 50,000 · Paid Sellers (15% conversion): 7,500 · Monthly Recurring Revenue (MRR): ₹65 Lakh.',
      'Annual Gross Merchandise Value (GMV) through platform: ₹120 Crore · Platform revenue run-rate: ₹12 Crore · Gross margin: 78%.',
      'Customer Acquisition Cost (CAC): ₹450 · Lifetime Value (LTV): ₹6,200 · Payback period: 4.2 months.',
    ],
  },
  {
    title: '10. Competitive Edge',
    body: [
      'Unlike Shopify (built for global Small and Medium Businesses) and Dukaan/Mydukaan (no AI moat), Pic to Cart owns three structural advantages:',
    ],
    bullets: [
      'AI-first onboarding — no other player generates the entire store from one photo.',
      'Bharat-native — GST invoices, FSSAI fields, COD, Shiprocket, vernacular UI baked in.',
      'Compounding cost economics — caching, prompt optimization and prefab themes reduce per-store AI cost by 90%.',
    ],
  },
  {
    title: '11. Team & Investment To Date',
    body: [
      'Founded by Antariksh Automations. 1,800+ engineering hours invested. ₹18+ Lakh of bootstrapped capital deployed across infrastructure, AI credits, design, and engineering.',
      'Hiring plan with this seed: 12 roles spanning Sales, Onboarding Specialists, Customer Success, Mobile Engineering, and Growth Marketing.',
    ],
  },
  {
    title: '12. The Ask',
    body: [
      '₹3.5 Crore seed for 12% equity. Lead investors with operating experience in Indian Software-as-a-Service (SaaS), Direct-to-Consumer (D2C), or fintech preferred. Closing target: 90 days.',
      'Contact: antarikshautomations@gmail.com · Live product: https://pictocart.in · Investor deck: https://pictocart.in/investors',
    ],
  },
];

function header(doc: jsPDF, logo: string, pageNum: number) {
  // Brand bar
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, PAGE.w, 14, 'F');
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 14, PAGE.w, 1.2, 'F');

  doc.addImage(logo, 'PNG', PAGE.m, 3, 9, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('Pic to Cart', PAGE.m + 11, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Business Plan · 24-Month Roadmap', PAGE.m + 36, 9);

  doc.setFontSize(8);
  doc.text(`Page ${pageNum}`, PAGE.w - PAGE.m, 9, { align: 'right' });
}

function footer(doc: jsPDF) {
  doc.setDrawColor(...BRAND.muted);
  doc.setLineWidth(0.2);
  doc.line(PAGE.m, PAGE.h - 14, PAGE.w - PAGE.m, PAGE.h - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text('Confidential · © Pic to Cart · pictocart.in', PAGE.m, PAGE.h - 8);
  doc.text('antarikshautomations@gmail.com', PAGE.w - PAGE.m, PAGE.h - 8, { align: 'right' });
}

export async function downloadBusinessPlanPDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogoDataUrl();

  let pageNum = 1;
  // ------- Cover -------
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE.w, PAGE.h, 'F');
  // Decorative gradient blocks
  doc.setFillColor(...BRAND.primary);
  doc.circle(PAGE.w + 10, -10, 70, 'F');
  doc.setFillColor(...BRAND.accent);
  doc.circle(-10, PAGE.h + 10, 80, 'F');

  doc.addImage(logo, 'PNG', PAGE.m, 30, 36, 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(46);
  doc.setTextColor(255, 255, 255);
  doc.text('Pic to Cart', PAGE.m, 95);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 255);
  doc.text('Business Plan & 24-Month Roadmap', PAGE.m, 110);

  doc.setFontSize(12);
  doc.setTextColor(180, 180, 200);
  doc.text("India's AI-native e-commerce Operating System", PAGE.m, 122);
  doc.text('for the next 100 million small sellers.', PAGE.m, 128);

  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(1);
  doc.line(PAGE.m, 145, PAGE.m + 60, 145);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 220);
  doc.text('Seed Round 2026  ·  ₹3.5 Crore  ·  Confidential', PAGE.m, 155);

  doc.setFontSize(9);
  doc.setTextColor(160, 160, 180);
  doc.text('Prepared by Antariksh Automations · antarikshautomations@gmail.com', PAGE.m, PAGE.h - 20);
  doc.text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), PAGE.m, PAGE.h - 14);

  // ------- Sections -------
  const addSection = (s: Section) => {
    doc.addPage();
    pageNum++;
    header(doc, logo, pageNum);
    footer(doc);

    let y = 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...BRAND.ink);
    doc.text(s.title, PAGE.m, y);
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.8);
    doc.line(PAGE.m, y + 2, PAGE.m + 24, y + 2);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.ink);
    const maxW = PAGE.w - 2 * PAGE.m;

    s.body.forEach((p) => {
      const lines = doc.splitTextToSize(p, maxW);
      if (y + lines.length * 5.5 > PAGE.h - 22) { doc.addPage(); pageNum++; header(doc, logo, pageNum); footer(doc); y = 28; }
      doc.text(lines, PAGE.m, y);
      y += lines.length * 5.5 + 3;
    });

    if (s.bullets) {
      y += 1;
      s.bullets.forEach((b) => {
        const lines = doc.splitTextToSize(b, maxW - 6);
        if (y + lines.length * 5.5 > PAGE.h - 22) { doc.addPage(); pageNum++; header(doc, logo, pageNum); footer(doc); y = 28; }
        doc.setFillColor(...BRAND.primary);
        doc.circle(PAGE.m + 1.5, y - 1.5, 0.9, 'F');
        doc.setTextColor(...BRAND.ink);
        doc.text(lines, PAGE.m + 6, y);
        y += lines.length * 5.5 + 2;
      });
    }
  };

  PLAN.forEach(addSection);

  // ------- Roadmap Table page -------
  doc.addPage();
  pageNum++;
  header(doc, logo, pageNum);
  footer(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.ink);
  doc.text('24-Month Roadmap', PAGE.m, 30);
  doc.setDrawColor(...BRAND.primary);
  doc.line(PAGE.m, 32, PAGE.m + 30, 32);

  const rows = [
    ['Q1–Q2 2026', 'Bharat Push', 'Vernacular UI · ONDC bridge · 10K sellers'],
    ['Q3–Q4 2026', 'Scale & Polish', 'WhatsApp Commerce · PWA → Native · 50K sellers · ₹65L MRR'],
    ['Q1–Q2 2027', 'MENA & SEA', 'Multi-currency · UAE · KSA · Singapore · Indonesia'],
    ['Q3–Q4 2027', 'Global SaaS', 'LATAM + Africa · Series A · 250K sellers · ₹6 Cr MRR'],
  ];
  let ry = 44;
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text('QUARTER', PAGE.m, ry);
  doc.text('THEME', PAGE.m + 38, ry);
  doc.text('KEY MILESTONES', PAGE.m + 78, ry);
  ry += 3;
  doc.setDrawColor(...BRAND.muted);
  doc.line(PAGE.m, ry, PAGE.w - PAGE.m, ry);
  ry += 5;
  doc.setTextColor(...BRAND.ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  rows.forEach(([q, t, m], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...BRAND.bgSoft);
      doc.rect(PAGE.m - 2, ry - 4, PAGE.w - 2 * PAGE.m + 4, 14, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(q, PAGE.m, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(t, PAGE.m + 38, ry);
    const mLines = doc.splitTextToSize(m, PAGE.w - PAGE.m - (PAGE.m + 78));
    doc.text(mLines, PAGE.m + 78, ry);
    ry += 14;
  });

  // ------- Closing -------
  doc.addPage();
  pageNum++;
  header(doc, logo, pageNum);
  footer(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...BRAND.ink);
  doc.text("Let's build the", PAGE.m, 80);
  doc.setTextColor(...BRAND.primary);
  doc.text('Shopify of Bharat.', PAGE.m, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.muted);
  doc.text('You bring the capital. We bring the product, the team, and the obsession.', PAGE.m, 110);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.ink);
  doc.text('antarikshautomations@gmail.com', PAGE.m, 135);
  doc.text('https://pictocart.in', PAGE.m, 142);

  doc.save('PicToCart-Business-Plan.pdf');
}
