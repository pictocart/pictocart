import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, Ticket, Loader2, LogOut, Send, Wallet as WalletIcon, Palette, Users, Sparkles, BookOpen, Key, CheckCircle2, AlertTriangle, ShieldCheck, Sun, Moon, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CustomThemeBuilderModal } from "@/components/onboarding/StepTheme";

const PartnerDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("stores");
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("partner-theme") !== "light");

  // Email verification state
  const [verificationOtp, setVerificationOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Wallet redemption state
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Store plan filter state
  const [planFilter, setPlanFilter] = useState("all");

  // Theme Builder states
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerThemeId, setDesignerThemeId] = useState("");
  const [designerThemeCategory, setDesignerThemeCategory] = useState("fashion");
  const [designName, setDesignName] = useState("");
  const [designDesc, setDesignDesc] = useState("");
  const [designKey, setDesignKey] = useState("");

  const [builderData, setBuilderData] = useState<any>({
    storeName: "Custom Design",
    category: "fashion",
    slug: "style-up-boutique",
    selectedThemeId: "",
    customThemeConfig: {
      nav: "classic",
      footer: "classic",
      sections: [],
      pages: {},
      palette: {},
      fonts: {},
      name: "Custom Theme"
    }
  });

  useEffect(() => {
    if (designerOpen) {
      const activeSlug = designerThemeCategory === 'food' 
        ? 'vibrant-gourmet' 
        : (designerThemeCategory === 'beauty' 
          ? 'glow-co-skincare' 
          : (designerThemeCategory === 'electronics' 
            ? 'tech-quantum-gears' 
            : (designerThemeCategory === 'other' 
              ? 'apex-gym-supplements' 
              : 'style-up-boutique')));
      
      setBuilderData({
        storeName: designName || "Custom Design",
        category: designerThemeCategory || "fashion",
        slug: activeSlug,
        selectedThemeId: designerThemeId,
        customThemeConfig: {
          nav: "classic",
          footer: "classic",
          sections: [],
          pages: {},
          palette: {},
          fonts: {},
          name: designName || "Custom Theme"
        }
      });
    }
  }, [designerOpen, designerThemeId, designerThemeCategory, designName]);

  const openInNewWindow = (url: string) => {
    const w = 1280;
    const h = 800;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open(
      url,
      '_blank',
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  const partnerQ = useQuery({
    enabled: !!user,
    queryKey: ["my-partner", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const partner = partnerQ.data;

  // 1. Stores Query
  const storesQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-stores", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select(`
          id, name, slug, is_published, partner_handover_status, created_at, user_id,
          subscriptions ( plan, status )
        `)
        .eq("owned_by_partner_id", partner!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 2. Demo Shops Query (filtering out hidden ones)
  const demoShopsQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-demo-shops", partner?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_visible_demo_shops_for_partner", {
          _partner_id: partner.id
        });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Licenses Query
  const licensesQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-licenses-list", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_licenses")
        .select(`
          id, status, license_type, license_key, consumed_by_store_id, consumed_at,
          stores ( name, slug )
        `)
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 4. Partner Wallet Query
  const walletQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-wallet", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_wallet")
        .select("*")
        .eq("partner_id", partner!.id)
        .maybeSingle();
      return data;
    },
  });

  // 5. Wallet Transactions Query
  const txQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-wallet-tx", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_wallet_transaction")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // 6. Base Themes Query
  const baseThemesQ = useQuery({
    enabled: !!partner?.id,
    queryKey: ["partner-base-themes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("theme_master_projects")
        .select("*")
        .is("created_by", null)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      setSendingOtp(true);
      setOtpSent(false);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("partners")
        .update({
          email_verification_otp: code,
          otp_expires_at: expires
        })
        .eq("id", partner!.id);

      if (error) throw error;

      // Send OTP via transactional email edge function
      try {
        const res = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "customer-otp",
            recipientEmail: partner!.email,
            idempotencyKey: `partner-otp-${partner!.id}-${Date.now()}`,
            templateData: {
              storeName: "PicToCart Partner Program",
              otp: code,
              purpose: "verification",
            },
          },
        });
        if (res.error) {
          console.warn("send-transactional-email failed:", res.error);
        } else if (res.data?.success) {
          return true;
        }
      } catch (e) {
        console.warn("send-transactional-email invoke error:", e);
      }

      return false;
    },
    onSuccess: (sent) => {
      qc.invalidateQueries({ queryKey: ["my-partner"] });
      if (sent) {
        toast.success("Verification code sent to " + partner!.email);
      } else {
        toast.error("Could not send verification email. Please try again or contact support.");
      }
      setOtpSent(sent); // only show OTP input if email was sent
      setSendingOtp(false);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to send code");
      setSendingOtp(false);
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      setVerifyingOtp(true);
      if (!partner?.email_verification_otp || partner.email_verification_otp !== verificationOtp.trim()) {
        throw new Error("Invalid verification code. Please check and try again.");
      }
      if (partner.otp_expires_at && new Date() > new Date(partner.otp_expires_at)) {
        throw new Error("Verification code has expired. Please request a new one.");
      }

      const { error } = await supabase
        .from("partners")
        .update({
          email_verified: true,
          email_verification_otp: null,
          otp_expires_at: null
        })
        .eq("id", partner.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email verified successfully! Welcome to PicToCart Partner Dashboard.");
      setVerifyingOtp(false);
      qc.invalidateQueries({ queryKey: ["my-partner"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Verification failed");
      setVerifyingOtp(false);
    }
  });

  const redeemCode = async () => {
    if (!oneTimeCode.trim()) {
      toast.error("Please enter a one time code");
      return;
    }
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_partner_one_time_code", {
        _partner_id: partner!.id,
        _code: oneTimeCode.trim()
      });
      if (error) throw error;

      toast.success(`Successfully redeemed ${data} AI credits!`);
      setOneTimeCode("");
      qc.invalidateQueries({ queryKey: ["partner-wallet"] });
      qc.invalidateQueries({ queryKey: ["partner-wallet-tx"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (partnerQ.isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  
  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-orange-500 font-bold">Not a partner account</CardTitle>
            <CardDescription className="text-slate-400">
              This area is only available to registered Pic To Cart partners. If you should have access, contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => signOut()}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Email Verification Overlay ---
  if (!partner.email_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <Card className="max-w-md w-full border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl z-10 animate-in fade-in zoom-in duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-orange-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Email Verification Required</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Hello <span className="font-semibold text-orange-400">{partner.name}</span>. You need to verify your email <span className="text-slate-200 underline">{partner.email}</span> before accessing your Partner Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 space-y-2">
              <p className="font-semibold text-slate-200">Instructions:</p>
              <p>1. Click "Send Verification Code" below.</p>
              <p>2. Check your email (or dev toast) for the 6-digit code.</p>
              <p>3. Enter the code and click "Verify".</p>
            </div>

            <div className="space-y-4">
              {!partner.email_verification_otp && !otpSent ? (
                <Button 
                  onClick={() => sendOtpMutation.mutate()} 
                  disabled={sendingOtp}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg"
                >
                  {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Verification Code
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter 6-Digit Code</Label>
                    <Input 
                      id="otp" 
                      placeholder="e.g. 123456" 
                      value={verificationOtp} 
                      onChange={(e) => setVerificationOtp(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 tracking-widest text-center text-lg font-bold h-12 focus-visible:ring-orange-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => sendOtpMutation.mutate()} 
                      disabled={sendingOtp}
                      className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Resend Code
                    </Button>
                    <Button 
                      onClick={() => verifyOtpMutation.mutate()} 
                      disabled={verifyingOtp || verificationOtp.length !== 6}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Verify Code"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center pt-2">
              <Button variant="ghost" onClick={() => signOut()} className="text-slate-400 hover:text-white hover:bg-slate-800/50">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter stores based on plan filter
  const filteredStores = (storesQ.data ?? []).filter((store: any) => {
    const activePlan = store.subscriptions?.plan || "free";
    if (planFilter === "all") return true;
    return activePlan === planFilter;
  });

  return (
    <div className={isDarkMode ? "dark-theme" : "light-theme"}>
      <style dangerouslySetInnerHTML={{ __html: `
        .light-theme {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        .light-theme .min-h-screen {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        .light-theme .bg-slate-950 {
          background-color: #f8fafc !important;
        }
        .light-theme .bg-slate-900 {
          background-color: #ffffff !important;
        }
        .light-theme .bg-slate-900\\/40,
        .light-theme .bg-slate-900\\/50,
        .light-theme .bg-slate-900\\/60,
        .light-theme .bg-slate-900\\/80 {
          background-color: #ffffff !important;
        }
        .light-theme .bg-slate-950\\/50,
        .light-theme .bg-slate-950\\/60 {
          background-color: #f1f5f9 !important;
        }
        .light-theme .bg-slate-800 {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .light-theme .bg-slate-800\\/20 {
          background-color: rgba(226, 232, 240, 0.4) !important;
        }
        .light-theme .border-slate-800,
        .light-theme .border-slate-750,
        .light-theme .border-slate-700,
        .light-theme .border-slate-800\\/50 {
          border-color: #e2e8f0 !important;
        }
        .light-theme .text-slate-100,
        .light-theme .text-slate-200,
        .light-theme .text-slate-300,
        .light-theme .text-white {
          color: #0f172a !important;
        }
        .light-theme .text-slate-400,
        .light-theme .text-slate-500 {
          color: #64748b !important;
        }
        .light-theme .hover\\:text-white:hover {
          color: #0f172a !important;
        }
        .light-theme .hover\\:bg-slate-800:hover {
          background-color: #f1f5f9 !important;
        }
        .light-theme .hover\\:bg-slate-750:hover,
        .light-theme .hover\\:bg-slate-700:hover {
          background-color: #e2e8f0 !important;
        }
        .light-theme input, 
        .light-theme select, 
        .light-theme textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .light-theme input::placeholder {
          color: #94a3b8 !important;
        }
        .light-theme .data-\\[state\\=active\\]\\:bg-slate-800[data-state=active] {
          background-color: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
        }
        .light-theme .border-orange-500\\/30 {
          border-color: rgba(249, 115, 22, 0.3) !important;
        }
        .light-theme .bg-orange-500\\/5 {
          background-color: rgba(249, 115, 22, 0.05) !important;
        }
      `}} />
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 transition-colors duration-200">
      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-orange-500 tracking-widest uppercase">PicToCart</div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Partner Dashboard 
                <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/5 text-[10px]">
                  ID: {partner.partner_id_code || "N/A"}
                </Badge>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="font-semibold text-sm text-slate-200">{partner.name}</div>
              <div className="text-xs text-slate-400 capitalize">{partner.partner_type} partner</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newMode = !isDarkMode;
                setIsDarkMode(newMode);
                localStorage.setItem("partner-theme", newMode ? "dark" : "light");
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Wallet Balance</span>
                <WalletIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
                {(walletQ.data?.balance ?? 0).toLocaleString()}
                <span className="text-xs text-slate-400 font-normal">credits</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Merchants Onboarded</span>
                <Store className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {storesQ.data?.length ?? 0}
                <span className="text-xs text-slate-400 font-normal ml-1">stores</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Allocated Licenses</span>
                <Ticket className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {licensesQ.data?.length ?? 0}
                <span className="text-xs text-slate-400 font-normal ml-1">total</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Referral Code</span>
                <Key className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-indigo-400">
                {partner.referral_code}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="stores" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2">
              <Store className="w-4 h-4" /> Stores
            </TabsTrigger>
            <TabsTrigger value="demo-shops" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2">
              <BookOpen className="w-4 h-4" /> Demo Shops
            </TabsTrigger>
            <TabsTrigger value="licenses" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2">
              <Ticket className="w-4 h-4" /> Licenses
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2">
              <WalletIcon className="w-4 h-4" /> AI Wallet
            </TabsTrigger>
            {/* 
            <TabsTrigger value="themes" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2">
              <Palette className="w-4 h-4" /> Themes
            </TabsTrigger>
            */}
          </TabsList>

          {/* 1. Stores Tab */}
          <TabsContent value="stores">
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-100 dark:text-white">Onboarded Stores</CardTitle>
                  <CardDescription className="text-slate-400">Stores created by you or connected via your partner license.</CardDescription>
                </div>
                
                {/* Plan filters */}
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {["all", "free", "starter", "growth"].map((plan) => (
                    <Button 
                      key={plan}
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setPlanFilter(plan)}
                      className={`capitalize text-xs px-3 py-1.5 h-8 ${planFilter === plan ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      {plan}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {storesQ.isLoading ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                ) : filteredStores.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    No stores found matching the filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Store Name</th>
                          <th className="px-4 py-3">Slug</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredStores.map((store: any) => {
                          const storePlan = store.subscriptions?.plan || "free";
                          return (
                            <tr key={store.id} className="hover:bg-slate-800/20">
                              <td className="px-4 py-4 font-medium text-white">{store.name}</td>
                              <td className="px-4 py-4 font-mono text-xs text-slate-400">/{store.slug}</td>
                              <td className="px-4 py-4">
                                <Badge variant="outline" className={`capitalize ${
                                  storePlan === "growth" ? "border-purple-500/30 text-purple-400 bg-purple-500/5" :
                                  storePlan === "starter" ? "border-orange-500/30 text-orange-400 bg-orange-500/5" :
                                  "border-slate-500/30 text-slate-400"
                                }`}>
                                  {storePlan}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                {store.is_published ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30" variant="outline">Published</Badge>
                                ) : (
                                  <Badge className="bg-slate-800 text-slate-400 border-slate-700" variant="outline">Draft</Badge>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">{format(new Date(store.created_at), "dd MMM yyyy")}</td>
                              <td className="px-4 py-4 text-right">
                                <Button size="sm" variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white" asChild>
                                  <Link to={`/dashboard?store=${store.id}`}>Manage</Link>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Demo Shops Tab */}
          <TabsContent value="demo-shops">
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-slate-100 dark:text-white">Demo Shops & Test Users</CardTitle>
                <CardDescription className="text-slate-400">Pre-built demo stores categorized for immediate merchant demonstrations.</CardDescription>
              </CardHeader>
              <CardContent>
                {demoShopsQ.isLoading ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                ) : (demoShopsQ.data ?? []).length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    No demo shops configured. Contact Super Admin to add demo stores.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(demoShopsQ.data as any[] ?? []).map((shop: any) => (
                      <Card key={shop.id} className="border-slate-800 bg-slate-950/60 overflow-hidden group">
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 capitalize">
                              {shop.category}
                            </Badge>
                            <span className="text-[10px] text-slate-500 font-mono">Demo</span>
                          </div>
                          
                          <div>
                            <h3 className="font-bold text-white text-base group-hover:text-orange-400 transition-colors">{shop.shop_name}</h3>
                            <p className="text-xs text-slate-400 mt-1 font-mono">ID: {shop.shop_id}</p>
                          </div>

                          {shop.extra_message && (
                            <div className="bg-slate-900/80 p-3 rounded text-xs text-slate-400 italic border border-slate-800/50">
                              "{shop.extra_message}"
                            </div>
                          )}

                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/50 text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Username:</span>
                              <span className="text-slate-300 select-all">{shop.shop_id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Password:</span>
                              <span className="text-slate-300 select-all">{shop.password}</span>
                            </div>
                          </div>

                          {shop.direct_access_url && (
                            <div className="space-y-2">
                              <Button 
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white gap-2" 
                                onClick={() => openInNewWindow(`/auth?email=${encodeURIComponent(shop.shop_id)}&password=${encodeURIComponent(shop.password)}`)}
                              >
                                Open Demo Shop
                              </Button>
                              <p className="text-[10px] text-slate-500 text-center">
                                💡 Tip: Right-click & select "Open link in incognito" to keep partner session active.
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Licenses Tab */}
          <TabsContent value="licenses">
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-slate-100 dark:text-white">License Inventory</CardTitle>
                <CardDescription className="text-slate-400">Share these special referral keys with merchants during setup. Starter installs Starter plan, Growth installs Growth plan.</CardDescription>
              </CardHeader>
              <CardContent>
                {licensesQ.isLoading ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                ) : (licensesQ.data ?? []).length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    You don't have any licenses allocated. Contact Super Admin to request license keys.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Starter</Badge>
                        <span className="font-medium">
                          <strong className="text-orange-400 font-semibold mr-1">{(licensesQ.data ?? []).filter((l: any) => (l.license_type === "basic" || l.license_type === "starter") && l.status === "available").length}</strong> Available
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Growth</Badge>
                        <span className="font-medium">
                          <strong className="text-purple-400 font-semibold mr-1">{(licensesQ.data ?? []).filter((l: any) => (l.license_type === "premium" || l.license_type === "growth") && l.status === "available").length}</strong> Available
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-4 py-3 rounded-l-lg">License Key</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Consumed By Store</th>
                            <th className="px-4 py-3 rounded-r-lg">Consumed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {(licensesQ.data ?? []).map((lic: any) => (
                            <tr key={lic.id} className="hover:bg-slate-800/20">
                              <td className="px-4 py-4 font-mono font-bold text-slate-100 select-all">{lic.license_key || "Generating..."}</td>
                              <td className="px-4 py-4">
                                <Badge className={
                                  (lic.license_type === "premium" || lic.license_type === "growth") ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : 
                                  "bg-orange-500/10 text-orange-400 border-orange-500/30"
                                } variant="outline">
                                  {
                                    (lic.license_type === "premium" || lic.license_type === "growth") ? "Growth" : 
                                    "Starter"
                                  }
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                {lic.status === "available" ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">Available</Badge>
                                ) : lic.status === "consumed" ? (
                                  <Badge className="bg-slate-800 text-slate-500 border-slate-700" variant="outline">Consumed</Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-400 border-red-500/30" variant="outline">Revoked</Badge>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-300 font-medium">
                                {lic.stores?.name ? (
                                  <Link to={`/dashboard?store=${lic.consumed_by_store_id}`} className="hover:underline text-orange-400">
                                    {lic.stores.name}
                                  </Link>
                                ) : lic.consumed_by_store_id ? (
                                  <span className="text-slate-500 font-mono text-xs">{lic.consumed_by_store_id.slice(0, 8)}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">
                                {lic.consumed_at ? format(new Date(lic.consumed_at), "dd MMM yyyy, HH:mm") : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. AI Wallet Tab */}
          <TabsContent value="wallet">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wallet actions */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-slate-800 bg-slate-900/40">
                  <CardHeader>
                    <CardTitle className="text-slate-100 dark:text-white">Recharge Wallet</CardTitle>
                    <CardDescription className="text-slate-400">Enter a One-Time Code generated by Super Admin to redeem credits.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otc">One Time Code</Label>
                      <Input 
                        id="otc" 
                        placeholder="OTC-XXXX-XXXX" 
                        value={oneTimeCode}
                        onChange={(e) => setOneTimeCode(e.target.value.toUpperCase())}
                        className="bg-slate-950 border-slate-800 text-slate-100 font-mono placeholder-slate-700"
                      />
                    </div>
                    <Button 
                      onClick={redeemCode} 
                      disabled={redeeming || !oneTimeCode.trim()} 
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium"
                    >
                      {redeeming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Redeem Code
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/40 text-sm text-slate-300">
                  <CardContent className="pt-6 space-y-3">
                    <p className="font-semibold text-white flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-orange-500" /> Wallet Policy</p>
                    <p>• Credits are used to customize merchant stores, design theme components, or test AI generators.</p>
                    <p>• Super Admin can generate recharging codes for specific credit amounts (e.g. 5,000, 10,000 credits).</p>
                    <p>• You earn AI credits every time a merchant applies a custom theme published by you!</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-2">
                <Card className="border-slate-800 bg-slate-900/40">
                  <CardHeader>
                    <CardTitle className="text-slate-100 dark:text-white">Wallet Activity</CardTitle>
                    <CardDescription className="text-slate-400">Chronological history of credit adjustments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {txQ.isLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                    ) : (txQ.data ?? []).length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        No activity recorded yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/50 max-h-[450px] overflow-y-auto pr-2">
                        {(txQ.data ?? []).map((t) => {
                          const isCredit = t.type === "credit";
                          return (
                            <div key={t.id} className="py-3 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-200">{t.reason}</div>
                                <div className="text-xs text-slate-500">{format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</div>
                              </div>
                              <div className={`text-sm font-bold font-mono ${isCredit ? "text-emerald-500" : "text-red-500"}`}>
                                {isCredit ? "+" : "-"}{t.credits.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 5. Themes Tab (Commented Out)
          <TabsContent value="themes">
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-slate-100 dark:text-white">Store Theme Templates</CardTitle>
                <CardDescription className="text-slate-400">Select any layout template to customize. Once saved and published, merchants can install your custom design and you will earn AI Credits!</CardDescription>
              </CardHeader>
              <CardContent>
                {baseThemesQ.isLoading ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                ) : (baseThemesQ.data ?? []).length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    No default themes available to customize.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-2 border-dashed border-orange-500/40 bg-slate-950/20 hover:border-orange-500 transition-all duration-300 overflow-hidden flex flex-col group justify-between p-5">
                      <div className="flex items-start gap-3.5 text-left">
                        <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                          <LayoutGrid className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white group-hover:text-orange-400 transition-colors">Make your own custom theme layout</h3>
                          <p className="text-xs text-slate-400 mt-1">Mix and match any of the headers, hero banners, product grids, and footers to create your own unique storefront brand identity.</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <CustomizeThemeButton 
                          themeId="theme-styleup-classic" 
                          themeName="Custom Theme" 
                          themeCategory="fashion"
                          isCustomCreator={true} 
                          onStartDesigning={(name, desc, key) => {
                            setDesignName(name);
                            setDesignDesc(desc);
                            setDesignKey(key);
                            setDesignerThemeId("theme-styleup-classic");
                            setDesignerThemeCategory("fashion");
                            setDesignerOpen(true);
                          }}
                        />
                      </div>
                    </Card>

                    {(baseThemesQ.data ?? []).map((theme) => (
                      <Card key={theme.id} className="border-slate-800 bg-slate-950/60 overflow-hidden flex flex-col group">
                        {theme.preview_image ? (
                          <div className="aspect-video relative overflow-hidden bg-slate-900 border-b border-slate-800">
                            <img 
                              src={theme.preview_image} 
                              alt={theme.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {theme.is_premium && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-amber-500 text-slate-950 font-semibold border-amber-600">Premium</Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-center text-slate-600">
                            <Palette className="w-12 h-12" />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <h3 className="font-bold text-white text-base group-hover:text-orange-400 transition-colors">{theme.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{theme.description || "No description provided."}</p>
                          </div>

                          <CustomizeThemeButton 
                            themeId={theme.theme_id} 
                            themeName={theme.name} 
                            themeCategory={theme.category || "fashion"}
                            onStartDesigning={(name, desc, key) => {
                              setDesignName(name);
                              setDesignDesc(desc);
                              setDesignKey(key);
                              setDesignerThemeId(theme.theme_id);
                              setDesignerThemeCategory(theme.category || "fashion");
                              setDesignerOpen(true);
                            }}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          */}
        </Tabs>
      </main>

      {designerOpen && (
        <CustomThemeBuilderModal
          onClose={() => setDesignerOpen(false)}
          data={builderData}
          setData={setBuilderData}
          themes={(baseThemesQ.data ?? []) as any}
          isPartnerEdit={true}
          partnerThemeKey={designKey}
          partnerThemeDesc={designDesc}
        />
      )}
    </div>
  </div>
  );
};

// Helper button to open Customize dialog
const CustomizeThemeButton = ({ 
  themeId, 
  themeName, 
  themeCategory = "fashion",
  isCustomCreator = false,
  onStartDesigning
}: { 
  themeId: string; 
  themeName: string; 
  themeCategory?: string;
  isCustomCreator?: boolean;
  onStartDesigning: (name: string, desc: string, key: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [customKey, setCustomKey] = useState("");

  const handleStart = () => {
    if (!name.trim()) {
      toast.error("Please enter a theme name");
      return;
    }
    if (!customKey.trim()) {
      toast.error("Please enter a unique key");
      return;
    }

    const cleanKey = customKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    onStartDesigning(name.trim(), desc.trim(), cleanKey);
    setOpen(false);
  };

  const isDarkMode = localStorage.getItem("partner-theme") !== "light";

  return (
    <div className={isDarkMode ? "dark-theme" : "light-theme"}>
      <div className="w-full">
        {isCustomCreator ? (
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => setOpen(true)}>
            Build Custom Theme
          </Button>
        ) : (
          <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium" onClick={() => setOpen(true)}>
            Customize Layout
          </Button>
        )}
        
        {open && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="max-w-md w-full border-slate-800 bg-slate-900 text-slate-100 shadow-2xl animate-in zoom-in duration-200">
              <CardHeader>
                <CardTitle>{isCustomCreator ? "Build Custom Theme" : "Configure Theme Design"}</CardTitle>
                <CardDescription className="text-slate-400">
                  {isCustomCreator 
                    ? "Give your brand new custom theme layout a name and key to publish it." 
                    : `Give your custom version of "${themeName}" a name and key to publish it.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="t_name">Theme Name</Label>
                  <Input 
                    id="t_name" 
                    placeholder="e.g. Minimalist Royal Orange" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t_desc">Description (Optional)</Label>
                  <Input 
                    id="t_desc" 
                    placeholder="e.g. Sleek design for jewelry and high fashion" 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t_key">Unique Theme Key (Special Key)</Label>
                  <Input 
                    id="t_key" 
                    placeholder="e.g. orange-luxe" 
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Merchants will search this key to find your theme. Format: letters, numbers, hyphens only.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 border-slate-800 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button onClick={handleStart} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                    Start Designing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerDashboard;
