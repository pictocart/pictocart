import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingCart, Heart, Search, ShoppingBag, ChevronDown,
  Truck, RotateCcw, Shield, Star, Minus, Plus, Trash2, Check,
  ArrowLeft, Package, Menu,
} from "lucide-react";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";

/* ============================================================================
   DYNAMIC 3D BACKGROUND COMPONENT
   Fully dynamic 3D particle system with mouse parallax, floating geometry,
   and animated gradient meshes - theme-aware and performant.
   ============================================================================ */

interface Dynamic3DBackgroundProps {
  theme: TK;
  intensity?: 'subtle' | 'medium' | 'intense';
  className?: string;
}

function Dynamic3DBackground({ theme, intensity = 'medium', className = '' }: Dynamic3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const shapesRef = useRef<Shape3D[]>([]);
  
  // Particle system configuration based on intensity
  const config = useMemo(() => {
    const base = {
      subtle: { particleCount: 40, shapeCount: 3, speed: 0.3 },
      medium: { particleCount: 80, shapeCount: 6, speed: 0.5 },
      intense: { particleCount: 150, shapeCount: 10, speed: 0.8 },
    };
    return base[intensity];
  }, [intensity]);

  // Initialize particles and 3D shapes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    particlesRef.current = Array.from({ length: config.particleCount }, () => createParticle(theme, canvas.offsetWidth, canvas.offsetHeight));
    
    // Create 3D geometric shapes
    shapesRef.current = Array.from({ length: config.shapeCount }, () => createShape3D(theme, canvas.offsetWidth, canvas.offsetHeight));

    // Mouse tracking for parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = (timestamp: number) => {
      timeRef.current = timestamp * 0.001 * config.speed;
      drawFrame(ctx!, canvas.offsetWidth, canvas.offsetHeight);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [theme, intensity, config.particleCount, config.shapeCount, config.speed]);

  // Draw frame
  const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const t = timeRef.current;
    const mouse = mouseRef.current;

    // Clear with theme background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw animated gradient mesh background
    drawGradientMesh(ctx, width, height, theme, t);

    // Draw 3D shapes (floating geometry)
    drawShapes3D(ctx, width, height, theme, t, mouse);

    // Draw particle system
    drawParticles(ctx, width, height, theme, t, mouse);

    // Draw subtle grid lines for depth
    drawDepthGrid(ctx, width, height, theme, t, mouse);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: -1 
      }}
      aria-hidden="true"
    />
  );
}

/* types */
interface TK{accent:string;bg:string;surface:string;textPrimary:string;textMuted:string;border:string;imgId:string;sub:"1.1"|"1.2";label:string;ff:string;}
type PPg="home"|"product"|"cart"|"checkout"|"confirm";
interface CI{id:number;name:string;price:number;qty:number;size:string;img:string;}
interface DP{id:number;name:string;price:number;orig:number;badge:string;stars:number;reviews:number;cat:string;sizes:string[];desc:string;feats:string[];}

/* theme tokens */
const L1:Record<string,TK>={
  "layout1-noir-atelier":{accent:"#c9a96e",bg:"#0d0d0d",surface:"#1a1a1a",textPrimary:"#f5f0eb",textMuted:"#888",border:"#2a2a2a",imgId:"noir-atelier",sub:"1.1",label:"Noir Atelier",ff:"Georgia,serif"},
  "layout1-ivory-luxe":  {accent:"#8b6914",bg:"#faf8f4",surface:"#f0ece4",textPrimary:"#1a1612",textMuted:"#8a7f72",border:"#e8e0d4",imgId:"ivory-luxe",  sub:"1.1",label:"Ivory Luxe",  ff:"Georgia,serif"},
  "layout1-neon-drip":   {accent:"#ff3d6b",bg:"#0f0f1a",surface:"#1a1a2e",textPrimary:"#f8fafc",textMuted:"#94a3b8",border:"#1e1e35",imgId:"neon-drip",   sub:"1.2",label:"Neon Drip",   ff:"system-ui"},
  "layout1-blush-street":{accent:"#e91e8c",bg:"#fff5f8",surface:"#ffeef4",textPrimary:"#1a0a12",textMuted:"#9b6e80",border:"#fad4e4",imgId:"blush-street",sub:"1.2",label:"Blush Street", ff:"system-ui"},
};
const SB="https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes";
const HU=(id:string)=>[SB,"hero",id].join("/")+".svg";
const PU=(id:string,n:number)=>[SB,"products",id+"-"+n].join("/")+".svg";
const bClr=(b:string,a:string)=>b==="SALE"?"#ef4444":b==="HOT"?"#f97316":a;

/* dummy products */
const PRODS:DP[]=[
  {id:1,name:"Silk Midi Dress",price:2499,orig:3124,badge:"NEW",stars:5,reviews:128,cat:"Dresses",sizes:["XS","S","M","L","XL"],desc:"A flowing silk midi dress with timeless silhouette. Wrap-style bodice and adjustable tie waist.",feats:["100% silk","Wrap style","Adjustable waist","Midi length","Machine washable"]},
  {id:2,name:"Linen Blazer Set",price:3899,orig:4874,badge:"SALE",stars:4,reviews:87,cat:"Blazers",sizes:["S","M","L","XL"],desc:"Sophisticated linen blazer set with tailored blazer and matching wide-leg trousers.",feats:["Premium linen","Tailored fit","Matching trousers","Two pockets","Dry clean"]},
  {id:3,name:"Wide Leg Trousers",price:1799,orig:2249,badge:"",stars:5,reviews:203,cat:"Trousers",sizes:["XS","S","M","L","XL","XXL"],desc:"High-waisted wide leg trousers in fluid drape. Relaxed silhouette.",feats:["High waist","Wide leg","Side pockets","Fluid drape","Versatile"]},
  {id:4,name:"Knit Cardigan",price:2199,orig:2749,badge:"HOT",stars:4,reviews:156,cat:"Knitwear",sizes:["S","M","L","XL"],desc:"Cosy fine-knit cardigan with ribbed hem. Open-front style with oversized buttons.",feats:["Fine knit","Open front","Ribbed trim","Oversized buttons","Hand wash"]},
  {id:5,name:"Slip Dress",price:1999,orig:2499,badge:"NEW",stars:5,reviews:74,cat:"Dresses",sizes:["XS","S","M","L"],desc:"Minimalist satin slip dress with lace trim and adjustable straps.",feats:["Satin fabric","Lace trim","Adjustable straps","Bias cut","Midi length"]},
  {id:6,name:"Structured Tote",price:2899,orig:3624,badge:"",stars:4,reviews:45,cat:"Accessories",sizes:["One Size"],desc:"Sleek structured tote in vegan leather with spacious compartment.",feats:["Vegan leather","Magnetic closure","Inner zip pocket","Laptop compartment","Shoulder carry"]},
  {id:7,name:"Cropped Trench",price:4299,orig:5374,badge:"NEW",stars:5,reviews:33,cat:"Blazers",sizes:["XS","S","M","L","XL"],desc:"Modern cropped trench with double-breasted front and belted waist.",feats:["Classic trench","Belted waist","Double-breasted","Water-resistant","Dry clean"]},
  {id:8,name:"Ribbed Polo Top",price:1299,orig:1624,badge:"HOT",stars:4,reviews:219,cat:"Knitwear",sizes:["XS","S","M","L","XL","XXL"],desc:"Versatile ribbed polo in soft stretch. Three-button placket.",feats:["Ribbed texture","3-button placket","Stretch fabric","Relaxed fit","Machine washable"]},
];
const REVS=[
  {name:"Priya S.",date:"Jan 2025",rating:5,text:"Absolutely stunning quality. The fabric is even better in person!",v:true},
  {name:"Meera K.",date:"Dec 2024",rating:5,text:"Perfect fit, runs true to size. Very happy with the purchase.",v:true},
  {name:"Ananya R.",date:"Nov 2024",rating:4,text:"Beautiful piece. Delivery took a bit long but worth it.",v:false},
];

/* cart hook */
const CK="l1_cart";
function useCart2(){
  const[items,si]=useState<CI[]>(()=>{try{return JSON.parse(localStorage.getItem(CK)||"[]")}catch{return[]}});
  const add=useCallback((it:Omit<CI,"qty">)=>{si(prev=>{const k=it.id+"_"+it.size;const ex=prev.find(i=>i.id+"_"+i.size===k);const n=ex?prev.map(i=>i.id+"_"+i.size===k?{...i,qty:i.qty+1}:i):[...prev,{...it,qty:1}];localStorage.setItem(CK,JSON.stringify(n));return n;});},[]);
  const rm=useCallback((id:number,size:string)=>{si(prev=>{const n=prev.filter(i=>!(i.id===id&&i.size===size));localStorage.setItem(CK,JSON.stringify(n));return n;});},[]);
  const uq=useCallback((id:number,size:string,qty:number)=>{si(prev=>{const n=qty<=0?prev.filter(i=>!(i.id===id&&i.size===size)):prev.map(i=>i.id===id&&i.size===size?{...i,qty}:i);localStorage.setItem(CK,JSON.stringify(n));return n;});},[]);
  const clear=useCallback(()=>{si([]);localStorage.removeItem(CK);},[]);
  const total=items.reduce((s,i)=>s+i.price*i.qty,0);
  const count=items.reduce((s,i)=>s+i.qty,0);
  return{items,add,rm,uq,clear,total,count};
}

/* product cards */
function PC11({p,t,go}:{p:DP;t:TK;go:()=>void}){
  return<div onClick={go} style={{borderRadius:10,overflow:"hidden",backgroundColor:t.surface,border:"1px solid "+t.border,cursor:"pointer",transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
    <div style={{position:"relative",height:200}}>
      <img src={PU(t.imgId,((p.id-1)%4)+1)} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      {p.badge&&<span style={{position:"absolute",top:8,left:8,backgroundColor:bClr(p.badge,t.accent),color:"#fff",padding:"2px 8px",fontSize:9,fontWeight:800,borderRadius:2}}>{p.badge}</span>}
      <button onClick={e=>e.stopPropagation()} style={{position:"absolute",top:8,right:8,background:t.surface+"ee",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Heart size={13} color={t.accent}/></button>
    </div>
    <div style={{padding:"10px 12px 12px"}}>
      <p style={{fontFamily:t.ff,fontSize:12,fontWeight:600,color:t.textPrimary,marginBottom:4}}>{p.name}</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <p style={{fontSize:13,fontWeight:700,color:t.accent}}>₹{p.price.toLocaleString("en-IN")}</p>
        <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(s=><Star key={s} size={10} style={{fill:s<=p.stars?"#f59e0b":"transparent",color:"#f59e0b"}}/>)}</div>
      </div>
      <div style={{display:"flex",gap:3}}>{["S","M","L"].map((sz,si)=><span key={sz} style={{width:22,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,border:"1px solid "+(si===1?t.accent:t.border),color:si===1?t.accent:t.textMuted,borderRadius:2}}>{sz}</span>)}</div>
    </div>
  </div>;
}

function PC12({p,t,go}:{p:DP;t:TK;go:()=>void}){
  const dk=t.bg==="#0f0f1a";
  return<div onClick={go} style={{borderRadius:14,overflow:"hidden",backgroundColor:t.surface,border:"1px solid "+t.border,cursor:"pointer",transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
    <div style={{position:"relative"}}>
      <img src={PU(t.imgId,((p.id-1)%4)+1)} alt={p.name} style={{width:"100%",display:"block",minHeight:160,objectFit:"cover"}}/>
      {p.badge&&<span style={{position:"absolute",top:10,left:10,backgroundColor:bClr(p.badge,t.accent),color:"#fff",padding:"3px 9px",borderRadius:999,fontSize:9,fontWeight:800}}>{p.badge}</span>}
    </div>
    <div style={{padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <p style={{fontSize:13,fontWeight:700,color:t.textPrimary,flex:1}}>{p.name}</p>
        <Heart size={14} color={t.textMuted} style={{cursor:"pointer",flexShrink:0}}/>
      </div>
      <p style={{fontSize:14,fontWeight:900,color:t.accent,margin:"4px 0 8px"}}>₹{p.price.toLocaleString("en-IN")}</p>
      <div style={{display:"flex",gap:6}}>{(dk?["#1a1a1a","#f5f0eb","#c9a96e"]:["#0f0f1a","#ff3d6b","#e91e8c"]).map(c=><span key={c} style={{width:14,height:14,borderRadius:"50%",backgroundColor:c,border:"1px solid "+(dk?"#444":"#ddd")}}/>)}</div>
    </div>
  </div>;
}

/* navbars */
function Nav11({t,n,onCart,onHome}:{t:TK;n:number;onCart:()=>void;onHome:()=>void}){
  return<>
    <div style={{backgroundColor:t.accent,color:"#fff",textAlign:"center",padding:"7px 16px",fontSize:11,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase"}}>Free Shipping above ₹999 | New Summer Collection Live</div>
    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 32px",borderBottom:"1px solid "+t.border,backgroundColor:t.surface,position:"sticky",top:0,zIndex:50}}>
      <button onClick={onHome} style={{fontFamily:t.ff,fontWeight:900,fontSize:17,letterSpacing:"0.25em",textTransform:"uppercase",background:"none",border:"none",cursor:"pointer",color:t.textPrimary}}>MAISON</button>
      <div style={{display:"flex",gap:28}}>{["New In","Women","Men","Sale"].map((l,i)=><button key={l} onClick={onHome} style={{fontSize:11,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:i===0?t.accent:t.textMuted,background:"none",border:"none",cursor:"pointer",borderBottom:i===0?"2px solid "+t.accent:"none",paddingBottom:2}}>{l}</button>)}</div>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <Search size={16} color={t.textMuted} style={{cursor:"pointer"}}/>
        <Heart size={16} color={t.textMuted} style={{cursor:"pointer"}}/>
        <button onClick={onCart} style={{position:"relative",background:"none",border:"none",cursor:"pointer"}}>
          <ShoppingBag size={18} color={t.textPrimary}/>
          {n>0&&<span style={{position:"absolute",top:-8,right:-8,backgroundColor:t.accent,color:"#fff",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{n}</span>}
        </button>
      </div>
    </nav>
  </>;
}

function Nav12({t,n,onCart,onHome}:{t:TK;n:number;onCart:()=>void;onHome:()=>void}){
  const dk=t.bg==="#0f0f1a";
  return<nav style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid "+t.border,backgroundColor:t.bg,position:"sticky",top:0,zIndex:50}}>
    <Menu size={20} color={t.textPrimary} style={{cursor:"pointer",flexShrink:0}}/>
    <div style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:999,border:"1px solid "+t.border,backgroundColor:dk?"#ffffff0a":"#00000008"}}>
      <Search size={13} color={t.textMuted}/><span style={{fontSize:12,color:t.textMuted}}>Search drops, brands, styles…</span>
    </div>
    <button onClick={onHome} style={{fontSize:16,fontWeight:900,textTransform:"uppercase",letterSpacing:"-0.02em",flexShrink:0,background:"none",border:"none",cursor:"pointer",color:t.textPrimary}}>DRIP<span style={{color:t.accent}}>.</span></button>
    <button onClick={onCart} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:999,backgroundColor:t.accent,color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",flexShrink:0}}>
      <ShoppingCart size={13}/>{n>0?n+" items":"Cart"}
    </button>
  </nav>;
}

/* mini storefront preview */
function Layout1Preview({themeId}:{themeId:string}){
  const t=L1[themeId];
  if(!t) return<div style={{padding:40,textAlign:"center",color:"#888"}}>Theme not found.</div>;
  const cart=useCart2();
  const[pg,setPg]=useState<PPg>("home");
  const goHome=()=>setPg("home");
  const goCart=()=>setPg("cart");
  const Nav=t.sub==="1.1"?Nav11:Nav12;
  
  // Determine intensity based on theme
  const intensity = t.sub === "1.2" ? "intense" : "normal";
  
  return (
    <div style={{backgroundColor:t.bg,color:t.textPrimary,minHeight:"100vh",fontFamily:"system-ui",position:"relative",overflow:"hidden"}}>
      {/* Dynamic 3D Background */}
      <Dynamic3DBackground theme={t} intensity={intensity as any} />
      
      <Nav t={t} n={cart.count} onCart={goCart} onHome={goHome}/>
      <div style={{position:"relative",zIndex:10,padding:20,textAlign:"center"}}>
        <h1 style={{fontFamily:t.ff,fontSize:32,fontWeight:900,color:t.textPrimary,marginBottom:16}}>Interactive Theme Preview</h1>
        <p style={{fontSize:14,color:t.textMuted,marginBottom:20}}>This is {t.label} theme preview with working navigation and cart.</p>
        <p style={{fontSize:12,color:t.textMuted,opacity:0.6,marginBottom:20}}>Move your mouse to interact with the 3D background</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          {PRODS.slice(0,4).map(p=><PC11 key={p.id} p={p} t={t} go={()=>{}}/>)}
        </div>
      </div>
    </div>
  );
}

/* main export */
export default function AdminThemeLivePreview(){
  const{themeId}=useParams();
  const[params]=useSearchParams();
  const storeSlug=params.get("storeSlug")??undefined;
  const embedded=params.get("embed")==="1";
  const isLayout1=themeId?.startsWith("layout1-");
  const[manifest,setManifest]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const[overrides,setOverrides]=useState<any>({});
  const[page,setPage]=useState<string>(params.get("page")??"home");
  const[products,setProducts]=useState<any[]>([]);
  const[sellerCategories,setSellerCategories]=useState<any[]>([]);

  // 1. Load theme manifest file
  useEffect(()=>{
    if(isLayout1){setLoading(false);return;}
    (async()=>{
      const{data}=await supabase.from("theme_master_versions").select("files_manifest").eq("theme_id",themeId!).order("version",{ascending:false}).limit(1).maybeSingle();
      setManifest(data?.files_manifest??null);setLoading(false);
    })();
  },[themeId,isLayout1]);

  // 2. Listen to visual editor message events (sync layout config)
  useEffect(() => {
    let received = false;
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "customiser:update") {
        received = true;
        if (ev.data.overrides) setOverrides(ev.data.overrides);
        if (ev.data.page) setPage(ev.data.page);
      }
    };
    window.addEventListener("message", onMessage);
    
    // Poll parent window until initial customiser:update is successfully received
    const interval = setInterval(() => {
      if (!received) {
        window.parent.postMessage({ type: "customiser:ready" }, "*");
      } else {
        clearInterval(interval);
      }
    }, 500);

    // Initial immediate post
    window.parent.postMessage({ type: "customiser:ready" }, "*");

    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(interval);
    };
  }, []);

  // 3. Load active store products catalog & category records
  useEffect(() => {
    if (!storeSlug) return;
    (async () => {
      try {
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, resolved_storefront_manifest")
          .eq("slug", storeSlug)
          .maybeSingle();
        if (storeError || !storeData) return;

        const m = storeData.resolved_storefront_manifest as any;
        if (m && typeof m === "object" && m.pages) {
          setManifest(m);
        }

        const { data: prodsData, error: prodsError } = await supabase
          .from("products")
          .select("id, title, category, price, images, compare_at_price")
          .eq("store_id", storeData.id);
        if (!prodsError && prodsData) {
          setProducts(prodsData);
        }

        const { data: catsData, error: catsError } = await supabase
          .from("categories")
          .select("*")
          .eq("store_id", storeData.id)
          .order("sort_order", { ascending: true });
        if (!catsError && catsData) {
          setSellerCategories(catsData);
        }
      } catch (err) {
        console.error("Error loading live preview store details", err);
      }
    })();
  }, [storeSlug]);

  if(isLayout1) return<Layout1Preview themeId={themeId!}/>;
  if(loading) return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Loader2 size={24} className="animate-spin"/></div>;
  if(!manifest) return<div style={{padding:32,textAlign:"center",color:"#888"}}>Theme not found.</div>;

  const activeProduct = products.length > 0 ? products[0] : {
    id: "dummy-1",
    title: "Sample Product Title",
    price: 999,
    compare_at_price: 1499,
    images: ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800"],
    category: "Clothing",
    description: "This is a premium quality sample product designed to demonstrate your theme's product detail page layout."
  };

  return <MasterThemeRenderer manifest={manifest} page={page} overrides={overrides} storeSlug={storeSlug} onNavigate={setPage} products={products} sellerCategories={sellerCategories} product={activeProduct}/>;
}