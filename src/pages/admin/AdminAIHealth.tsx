import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Zap, Activity, BarChart3, Play, CheckCircle2, XCircle,
  Loader2, RefreshCw, Clock, IndianRupee, Cpu, Globe,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Static registry of all AI-powered edge functions ────────────────────────
const AI_FUNCTIONS: {
  name: string;
  label: string;
  description: string;
  api: ('NVIDIA' | 'Pollinations')[];
  models: string[];
  hasLog: boolean;
}[] = [
  { name: 'generate-product',          label: 'Generate Product',          description: 'Vision AI reads product photo → generates title, description, SEO, metadata',       api: ['NVIDIA'],       models: ['meta/llama-3.2-11b-vision-instruct', 'meta/llama-3.2-90b-vision-instruct', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'], hasLog: false },
  { name: 'generate-product-image',    label: 'Generate Product Image',    description: 'Text-to-image for product photos via Pollinations Flux',                             api: ['Pollinations'], models: ['flux'],                                                        hasLog: false },
  { name: 'generate-blog',             label: 'Generate Blog',             description: 'Writes full SEO blog posts with metadata and image prompt',                          api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-blog-image',       label: 'Generate Blog Image',       description: 'Creates 16:9 cover and thumbnail images for blog posts',                             api: ['Pollinations'], models: ['flux'],                                                        hasLog: false },
  { name: 'generate-custom-page',      label: 'Generate Custom Page',      description: 'Generates full storefront pages (about, contact, custom) with AI content',           api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-section-content',  label: 'Generate Section Content',  description: 'Writes copy for individual theme sections; image mode uses Pollinations',            api: ['NVIDIA', 'Pollinations'], models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', 'flux'],  hasLog: false },
  { name: 'generate-store-policies',   label: 'Generate Store Policies',   description: 'Writes privacy, refund, shipping and T&C policy pages',                              api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-email-templates',  label: 'Generate Email Templates',  description: 'Creates HTML transactional email templates for the store',                           api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-marketing-copy',   label: 'Generate Marketing Copy',   description: 'Writes WhatsApp messages, SMS blasts, Instagram captions',                          api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-reviews',          label: 'Generate Reviews',          description: 'Seeds realistic product reviews for new stores',                                     api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-dashboard-insights', label: 'Dashboard Insights',      description: 'AI narrative summary of store performance metrics',                                  api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-and-ship-theme',   label: 'Generate & Ship Theme',     description: 'Full theme generation pipeline — DNA, sections, images, deploy',                    api: ['NVIDIA', 'Pollinations'], models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', 'flux'],  hasLog: true  },
  { name: 'refine-theme',              label: 'Refine Theme',              description: 'Applies merchant feedback to iteratively improve theme design',                      api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: true  },
  { name: 'remix-theme',               label: 'Remix Theme',               description: 'Creates a fresh color/font variant from an existing theme pack',                     api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'generate-theme-pack',       label: 'Generate Theme Pack',       description: 'Builds a complete multi-page theme pack with images and sections',                   api: ['NVIDIA', 'Pollinations'], models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', 'flux'],  hasLog: false },
  { name: 'plan-monthly-calendar',     label: 'Plan Monthly Calendar',     description: 'Plans monthly theme generation schedule with category variety',                      api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: true  },
  { name: 'merchant-assistant',        label: 'Merchant Assistant',        description: 'Conversational AI assistant for merchants (primary: Sarvam, fallback: NVIDIA)',      api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'storefront-assistant',      label: 'Storefront Assistant',      description: 'Customer-facing AI chatbot for storefronts (primary: NVIDIA, fallback: Groq)',       api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'sourcing-import',           label: 'Sourcing Import',           description: 'Rewrites wholesale supplier product copy into D2C storefront copy',                  api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'store-engagement',          label: 'Store Engagement',          description: 'Generates engagement prompts and notification copy for merchants',                   api: ['NVIDIA'],       models: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],             hasLog: false },
  { name: 'send-newsletter',           label: 'Send Newsletter',           description: 'Sends newsletters via Resend API (no LLM — direct email relay)',                    api: [],               models: [],                                                              hasLog: false },
  { name: 'send-order-notification',   label: 'Order Notification',        description: 'Sends order emails via Resend API (no LLM — direct email relay)',                   api: [],               models: [],                                                              hasLog: false },
  { name: 'auth-email-hook',           label: 'Auth Email Hook',           description: 'Renders React Email templates for Supabase auth events (no LLM)',                   api: [],               models: [],                                                              hasLog: false },
];

const FEATURE_MAPPING = [
  {
    title: "Product Add Form: Detail Auto-Extraction",
    place: "Product Management (Add/Edit Product Form)",
    purpose: "Analyzes uploaded product images using Vision AI to automatically extract and generate detailed product titles, descriptions, categories, selling highlights, pricing, and search tags.",
    actionKey: "generate-product",
    primaryModelId: "meta/llama-3.2-11b-vision-instruct",
    fallbackModelId: "meta/llama-3.2-90b-vision-instruct"
  },
  {
    title: "AI Product Image Generator",
    place: "Product Management (Add/Edit Product Form)",
    purpose: "Generates realistic, premium product mockup photos and advertising graphics directly from text descriptions.",
    actionKey: "generate-product-image",
    primaryModelId: "flux",
    fallbackModelId: null
  },
  {
    title: "AI Store Customiser & Section Writer",
    place: "Visual Storefront Editor (/customise)",
    purpose: "Generates tailored copy, landing page hooks, headlines, and newsletter text for theme sections. Generates section-specific stock images based on store design DNA.",
    actionKey: "generate-section-content",
    primaryModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackModelId: null
  },
  {
    title: "AI Marketing Copy Generator",
    place: "Marketing Hub (/marketing/copywriter)",
    purpose: "Drafts conversational, conversion-optimized text copy for SMS blasts, WhatsApp campaigns, and Instagram captions.",
    actionKey: "generate-marketing-copy",
    primaryModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackModelId: null
  },
  {
    title: "AI Blog & Cover Generator",
    place: "Blog Management (/blog-posts/new)",
    purpose: "Writes full SEO blog posts with metadata and automatically generates matching 16:9 banner and thumbnail illustrations.",
    actionKey: "generate-blog",
    primaryModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackModelId: null
  },
  {
    title: "Merchant Assistant Copilot",
    place: "Dashboard Sidebar Chat Widget",
    purpose: "Conversational assistant that helps merchants manage their shop settings, understand sales metrics, and guide them on e-commerce best practices.",
    actionKey: "merchant-assistant",
    primaryModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackModelId: null
  },
  {
    title: "Customer Support Chatbot",
    place: "Customer Storefront Widget (/store/:slug)",
    purpose: "Automated chatbot that chats with store visitors, answers product-related questions, tells them about policies, and handles customer queries.",
    actionKey: "storefront-assistant",
    primaryModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackModelId: null
  }
];

// ─── API registry ─────────────────────────────────────────────────────────────
const API_META = {
  NVIDIA:      { label: 'NVIDIA NIM',       endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions', color: 'bg-green-100 text-green-800',  testModel: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning' },
  Pollinations:{ label: 'Pollinations.ai',  endpoint: 'https://image.pollinations.ai',                        color: 'bg-blue-100 text-blue-800',    testModel: 'flux' },
} as const;

type ApiName = keyof typeof API_META;
type TestStatus = 'idle' | 'loading' | 'ok' | 'error';

// ─── Hooks ────────────────────────────────────────────────────────────────────
const useCallLog = () => useQuery({
  queryKey: ['admin-ai-call-log'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('ai_call_log' as any)
      .select('function_name, model, prompt_tokens, completion_tokens, cost_inr, reuse_hit, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as unknown as {
      function_name: string; model: string; prompt_tokens: number;
      completion_tokens: number; cost_inr: number; reuse_hit: boolean; created_at: string;
    }[];
  },
  refetchInterval: 30_000,
});

const useActionCosts = () => useQuery({
  queryKey: ['admin-action-costs-ai'],
  queryFn: async () => {
    const { data } = await supabase
      .from('ai_action_costs' as any)
      .select('action_key, model, credits_cost:credits, fallback_model, is_active')
      .order('action_key');
    return (data || []) as unknown as { action_key: string; model: string; credits_cost: number; fallback_model: string | null; is_active: boolean }[];
  },
});

interface LlmModel {
  id: string;
  model_id: string;
  label: string;
  provider: string;
  api_base: string;
  is_active: boolean;
  supports_vision: boolean;
  notes: string | null;
  secret_key_name: string | null;
  api_key: string | null;  // masked in UI — only set when admin explicitly updates
}

const PROVIDERS = ['NVIDIA', 'Pollinations', 'Groq', 'Together AI', 'HuggingFace', 'Ollama', 'Other'];
const PROVIDER_COLORS: Record<string, string> = {
  NVIDIA:       'bg-green-100 text-green-800',
  Pollinations: 'bg-blue-100 text-blue-800',
  Groq:         'bg-orange-100 text-orange-800',
  'Together AI':'bg-purple-100 text-purple-800',
  HuggingFace:  'bg-yellow-100 text-yellow-800',
  Ollama:       'bg-gray-100 text-gray-800',
  Other:        'bg-slate-100 text-slate-800',
};

// Free/open-source model templates for quick-add
const FREE_MODEL_TEMPLATES = [
  { model_id: 'llama3-70b-8192',        label: 'Llama 3 70B',              provider: 'Groq',        api_base: 'https://api.groq.com/openai/v1/chat/completions',    notes: 'Groq free tier' },
  { model_id: 'llama-3.1-8b-instant',   label: 'Llama 3.1 8B Instant',     provider: 'Groq',        api_base: 'https://api.groq.com/openai/v1/chat/completions',    notes: 'Groq free tier — ultra fast' },
  { model_id: 'gemma2-9b-it',           label: 'Gemma 2 9B',               provider: 'Groq',        api_base: 'https://api.groq.com/openai/v1/chat/completions',    notes: 'Groq free tier' },
  { model_id: 'mixtral-8x7b-32768',     label: 'Mixtral 8x7B',             provider: 'Groq',        api_base: 'https://api.groq.com/openai/v1/chat/completions',    notes: 'Groq free — 32k context' },
  { model_id: 'ollama/llama3.2',        label: 'Llama 3.2 (Local)',         provider: 'Ollama',      api_base: 'http://localhost:11434/v1/chat/completions',          notes: 'Local — no key needed' },
  { model_id: 'ollama/mistral',         label: 'Mistral (Local)',           provider: 'Ollama',      api_base: 'http://localhost:11434/v1/chat/completions',          notes: 'Local — no key needed' },
  { model_id: 'ollama/qwen2.5',         label: 'Qwen 2.5 (Local)',          provider: 'Ollama',      api_base: 'http://localhost:11434/v1/chat/completions',          notes: 'Local — no key needed' },
];

const useLlmModels = () => useQuery({
  queryKey: ['platform-llm-models'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('platform_llm_models' as any)
      .select('id, model_id, label, provider, api_base, is_active, supports_vision, notes, secret_key_name, api_key')
      .order('provider')
      .order('label');
    if (error) throw error;
    return (data || []) as unknown as LlmModel[];
  },
});
// ─── API Status Card ──────────────────────────────────────────────────────────
const ApiStatusCard = ({ api }: { api: ApiName }) => {
  const meta = API_META[api];
  const [status, setStatus] = useState<TestStatus>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runTest = async () => {
    setStatus('loading');
    setErrorMsg('');
    const t0 = Date.now();
    try {
      if (api === 'Pollinations') {
        // Test by fetching a tiny 64x64 image
        const url = `https://image.pollinations.ai/p/test?width=64&height=64&nologo=true&model=flux&seed=1`;
        const res = await fetch(url);
        const ms = Date.now() - t0;
        setLatencyMs(ms);
        if (res.ok) { setStatus('ok'); toast.success(`Pollinations responded in ${ms}ms`); }
        else { setErrorMsg(`HTTP ${res.status}`); setStatus('error'); toast.error('Pollinations test failed'); }
      } else {
        // NVIDIA — call directly without going through merchant-assistant chat flow
        const { data, error } = await supabase.functions.invoke('merchant-assistant', {
          body: {
            _admin_model_test: true,
            model_id: meta.testModel,
            api_base: meta.endpoint,
            prompt: 'Reply with exactly one word: pong',
          },
        });
        const ms = Date.now() - t0;
        setLatencyMs(ms);
        if (error || data?.error) {
          setErrorMsg(data?.error || error?.message || 'Unknown error');
          setStatus('error');
          toast.error(`${meta.label} test failed`);
        } else {
          setStatus('ok');
          toast.success(`${meta.label} responded in ${ms}ms`);
        }
      }
    } catch (e: any) {
      setLatencyMs(Date.now() - t0);
      setErrorMsg(e.message || 'Network error');
      setStatus('error');
      toast.error(`${meta.label} test failed`);
    }
  };

  return (
    <Card className={status === 'ok' ? 'border-green-200' : status === 'error' ? 'border-red-200' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge className={meta.color}>{api}</Badge>
              {status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{meta.label}</p>
            <p className="text-[10px] font-mono text-muted-foreground break-all mt-0.5">{meta.endpoint}</p>
          </div>
          <Button size="sm" variant="outline" onClick={runTest} disabled={status === 'loading'} className="shrink-0 gap-1.5">
            {status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Test
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Test model:</span>
          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{meta.testModel}</code>
        </div>
        {latencyMs !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={latencyMs > 5000 ? 'text-orange-600' : 'text-green-600'}>{latencyMs}ms</span>
          </div>
        )}
        {status === 'error' && errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 rounded p-2 break-all">{errorMsg}</p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Function Row ─────────────────────────────────────────────────────────────
const FunctionRow = ({
  fn,
  logRows,
}: {
  fn: (typeof AI_FUNCTIONS)[0];
  logRows: { function_name: string; model: string; cost_inr: number; created_at: string }[];
}) => {
  const fnLogs = logRows.filter((r) => r.function_name === fn.name);
  const totalCost = fnLogs.reduce((s, r) => s + Number(r.cost_inr || 0), 0);
  const lastCall = fnLogs[0]?.created_at;

  return (
    <tr className="border-t hover:bg-muted/30 align-top">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{fn.label}</p>
        <p className="text-xs text-muted-foreground">{fn.description}</p>
        <code className="text-[10px] text-muted-foreground">{fn.name}</code>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {fn.api.map((a) => (
            <Badge key={a} className={`text-[10px] ${API_META[a].color}`}>{a}</Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {fn.models.map((m) => (
            <code key={m} className="text-[10px] bg-muted px-1 py-0.5 rounded">{m}</code>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {fn.hasLog ? (
          <span className="text-green-700 font-medium">Yes</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        {fnLogs.length > 0 ? (
          <div className="space-y-0.5">
            <div className="font-medium">{fnLogs.length} calls</div>
            <div className="text-muted-foreground flex items-center gap-1">
              <IndianRupee className="h-3 w-3" />₹{totalCost.toFixed(3)}
            </div>
            {lastCall && (
              <div className="text-muted-foreground">{new Date(lastCall).toLocaleDateString()}</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">No log</span>
        )}
      </td>
    </tr>
  );
};

// ─── Call Log Tab ─────────────────────────────────────────────────────────────
const CallLogTab = () => {
  const { data: logs = [], isLoading, refetch } = useCallLog();

  const totalCost = logs.reduce((s, r) => s + Number(r.cost_inr || 0), 0);
  const totalTokens = logs.reduce((s, r) => s + (r.prompt_tokens || 0) + (r.completion_tokens || 0), 0);
  const cacheHits = logs.filter((r) => r.reuse_hit).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCost = logs.filter((r) => r.created_at.startsWith(today))
    .reduce((s, r) => s + Number(r.cost_inr || 0), 0);

  // Group by model
  const byModel = logs.reduce((acc, r) => {
    acc[r.model] = (acc[r.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Last 500 logged AI calls (only functions that write to ai_call_log)</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total calls (500 max)', value: logs.length, icon: Activity },
          { label: 'Today cost', value: `₹${todayCost.toFixed(4)}`, icon: IndianRupee },
          { label: 'Total cost (batch)', value: `₹${totalCost.toFixed(3)}`, icon: IndianRupee },
          { label: 'Cache hits', value: cacheHits, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3 w-3" />{label}
            </div>
            <div className="text-xl font-bold mt-1">{value}</div>
          </Card>
        ))}
      </div>

      {/* Model distribution */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> Calls by Model</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
              <div key={model} className="flex items-center gap-1.5 bg-muted rounded px-2 py-1 text-xs">
                <code className="text-[10px]">{model}</code>
                <Badge variant="secondary" className="text-[10px] px-1">{count}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total tokens processed: {totalTokens.toLocaleString()}</p>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Function</th>
              <th className="px-4 py-2">Model</th>
              <th className="px-4 py-2">Tokens (in/out)</th>
              <th className="px-4 py-2">Cost ₹</th>
              <th className="px-4 py-2">Cache</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>}
            {!isLoading && logs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No AI call logs yet</td></tr>}
            {logs.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2"><code className="text-xs">{r.function_name}</code></td>
                <td className="px-4 py-2"><code className="text-xs">{r.model}</code></td>
                <td className="px-4 py-2 text-xs">{r.prompt_tokens} / {r.completion_tokens}</td>
                <td className="px-4 py-2 text-xs font-mono">₹{Number(r.cost_inr).toFixed(4)}</td>
                <td className="px-4 py-2">{r.reuse_hit ? <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Hit</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── Action Costs Tab ─────────────────────────────────────────────────────────
const ActionCostsTab = () => {
  const { data: costs = [], isLoading } = useActionCosts();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Credit costs and model assignments per AI action (from ai_action_costs table)</p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">Action Key</th>
              <th className="px-4 py-2">Model</th>
              <th className="px-4 py-2">Credits</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>}
            {costs.map((c) => (
              <tr key={c.action_key} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2"><code className="text-xs">{c.action_key}</code></td>
                <td className="px-4 py-2"><code className="text-xs text-muted-foreground">{c.model || '—'}</code></td>
                <td className="px-4 py-2 text-xs font-mono">{c.credits_cost}</td>
                <td className="px-4 py-2">
                  <Badge variant="secondary" className={c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── Model Test Button ────────────────────────────────────────────────────────
const ModelTestButton = ({ model, inlineApiKey }: { model: LlmModel; inlineApiKey?: string }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const test = async () => {
    setStatus('loading'); setErr(''); setMs(null);
    const t0 = Date.now();
    try {
      if (model.provider === 'Pollinations') {
        // Pollinations is a simple GET — no CORS issues
        const base = model.api_base.endsWith('/') ? model.api_base : model.api_base + '/';
        const url = `${base}test?width=64&height=64&nologo=true&model=flux&seed=1`;
        const res = await fetch(url);
        const elapsed = Date.now() - t0; setMs(elapsed);
        if (res.ok) { setStatus('ok'); toast.success(`${model.label}: OK in ${elapsed}ms`); }
        else { setErr(`HTTP ${res.status}`); setStatus('error'); }
        return;
      }

      // All other providers: route through edge function to avoid CORS
      // Pass inline key if provided (it will be used server-side, not in browser)
      const { data, error } = await supabase.functions.invoke('merchant-assistant', {
        body: {
          _admin_model_test: true,
          model_id: model.model_id,
          api_base: model.api_base,
          prompt: 'Reply with exactly one word: pong',
          // Pass inline key so edge fn can use it even if not in DB yet
          inline_api_key: inlineApiKey || undefined,
        },
      });
      const elapsed = Date.now() - t0; setMs(elapsed);
      if (error || data?.error) {
        setErr(data?.error || error?.message || 'Unknown error');
        setStatus('error');
        toast.error(`${model.label} failed`);
      } else {
        setStatus('ok');
        toast.success(`${model.label}: "${data?.reply || 'ok'}" in ${elapsed}ms`);
      }
    } catch (e: any) {
      setMs(Date.now() - t0);
      setErr(e.message || 'Network error');
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={test}
        disabled={status === 'loading'}
        className="h-7 px-2 gap-1 text-xs"
        title={!inlineApiKey && !model.api_key ? 'No API key set — will try edge function secret' : ''}
      >
        {status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        Test
      </Button>
      {status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
      {status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
      {ms !== null && (
        <span className={`text-[10px] font-mono shrink-0 ${ms > 5000 ? 'text-orange-500' : status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
          {ms}ms
        </span>
      )}
      {status === 'error' && err && (
        <span className="text-[10px] text-red-500 max-w-[140px] truncate" title={err}>{err}</span>
      )}
    </div>
  );
};
const EMPTY_FORM = {
  model_id: '', label: '', provider: 'NVIDIA',
  api_base: 'https://integrate.api.nvidia.com/v1/chat/completions',
  supports_vision: false, notes: '',
  api_key: '',  // actual key — saved to DB, masked after save
};

const ModelFormDialog = ({
  open, onClose, initial,
}: { open: boolean; onClose: () => void; initial: LlmModel | null }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const isEdit = !!initial;
  const hasStoredKey = !!initial?.api_key;

  // Re-populate form whenever dialog opens or target model changes
  useEffect(() => {
    if (open) {
      setForm(initial ? {
        model_id: initial.model_id,
        label: initial.label,
        provider: initial.provider,
        api_base: initial.api_base,
        supports_vision: initial.supports_vision,
        notes: initial.notes || '',
        api_key: '',
      } : { ...EMPTY_FORM });
      setShowKey(false);
    }
  }, [open, initial]);

  const save = async () => {
    if (!form.model_id.trim() || !form.label.trim() || !form.api_base.trim()) {
      toast.error('Model ID, label, and API base are required');
      return;
    }
    setSaving(true);
    const payload: any = {
      label: form.label.trim(),
      provider: form.provider,
      api_base: form.api_base.trim(),
      supports_vision: form.supports_vision,
      notes: form.notes.trim() || null,
    };
    // Only update api_key if user actually entered something
    if (form.api_key.trim()) payload.api_key = form.api_key.trim();

    let error;
    if (isEdit) {
      ({ error } = await supabase
        .from('platform_llm_models' as any)
        .update(payload)
        .eq('id', initial!.id));
    } else {
      ({ error } = await supabase
        .from('platform_llm_models' as any)
        .insert({ model_id: form.model_id.trim(), ...payload }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Model updated' : 'Model added');
    qc.invalidateQueries({ queryKey: ['platform-llm-models'] });
    onClose();
  };

  const F = (key: keyof typeof form, label: string, placeholder = '') => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        disabled={isEdit && key === 'model_id'}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Model' : 'Add New Model'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Quick-add free/open-source models */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quick add a free / open-source model</Label>
              <div className="flex flex-wrap gap-1.5">
                {FREE_MODEL_TEMPLATES.map((t) => (
                  <button
                    key={t.model_id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, model_id: t.model_id, label: t.label, provider: t.provider, api_base: t.api_base, notes: t.notes, api_key: '' }))}
                    className="text-[10px] px-2 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    <Badge className={`text-[9px] mr-1 ${PROVIDER_COLORS[t.provider] || PROVIDER_COLORS.Other}`}>{t.provider}</Badge>
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Click to prefill the form. Groq models need a free Groq API key. Ollama models are local — no key needed.</p>
            </div>
          )}
          {F('model_id', 'Model ID', 'e.g. nvidia/nemotron-3-nano-omni-30b-a3b-reasoning')}
          {F('label', 'Display Name', 'e.g. Nemotron 3 Nano')}

          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {F('api_base', 'API Base URL', 'https://integrate.api.nvidia.com/v1/chat/completions')}
          {F('notes', 'Notes (optional)', 'e.g. vision-only, 128k context…')}

          {/* API Key — saved to DB, shown masked */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              API Key
              {hasStoredKey && (
                <Badge className="ml-2 text-[10px] bg-green-100 text-green-700">Key saved</Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={hasStoredKey ? '••••••••  (leave blank to keep existing)' : 'nvapi-... or sk-...'}
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Saved securely in DB (admin-only RLS). Used by edge functions to call this model's API.
              {isEdit && ' Leave blank to keep the existing key.'}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Supports Vision</p>
              <p className="text-xs text-muted-foreground">Can process images in prompts</p>
            </div>
            <Switch
              checked={form.supports_vision}
              onCheckedChange={(v) => setForm({ ...form, supports_vision: v })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {/* Test button — uses the key in the form field (or stored key via edge fn) */}
          {form.model_id && form.api_base && (
            <ModelTestButton
              model={{
                id: initial?.id || 'preview',
                model_id: form.model_id,
                label: form.label || form.model_id,
                provider: form.provider,
                api_base: form.api_base,
                is_active: true,
                supports_vision: form.supports_vision,
                notes: form.notes || null,
                secret_key_name: null,
                api_key: form.api_key || initial?.api_key || null,
              }}
              inlineApiKey={form.api_key || undefined}
            />
          )}
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Action Cost Model Editor ─────────────────────────────────────────────────
const ActionCostModelCell = ({ row, models }: { row: { action_key: string; model: string; credits_cost: number; fallback_model: string | null; is_active: boolean }; models: LlmModel[] }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row.model);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('ai_action_costs' as any).update({ model: val }).eq('action_key', row.action_key);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Model updated for ${row.action_key}`);
    qc.invalidateQueries({ queryKey: ['admin-action-costs-ai'] });
    setEditing(false);
  };

  if (!editing) return (
    <div className="flex items-center gap-1.5">
      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{row.model}</code>
      <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
    </div>
  );

  return (
    <div className="flex items-center gap-1.5">
      <Select value={val} onValueChange={setVal}>
        <SelectTrigger className="h-7 text-xs w-52"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-60">
          {models.filter((m) => m.is_active).map((m) => (
            <SelectItem key={m.model_id} value={m.model_id} className="text-xs">
              <span className="flex items-center gap-1.5">
                <Badge className={`text-[9px] px-1 ${PROVIDER_COLORS[m.provider] || PROVIDER_COLORS.Other}`}>{m.provider}</Badge>
                {m.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-7 px-2 text-xs" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
      </Button>
      <button onClick={() => { setEditing(false); setVal(row.model); }} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
    </div>
  );
};

// ─── Models Tab ───────────────────────────────────────────────────────────────
const ModelsTab = () => {
  const qc = useQueryClient();
  const { data: models = [], isLoading } = useLlmModels();
  const { data: costs = [] } = useActionCosts();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LlmModel | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const toggleActive = async (m: LlmModel) => {
    const { error } = await supabase
      .from('platform_llm_models' as any)
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(m.is_active ? `${m.label} disabled` : `${m.label} enabled`);
    qc.invalidateQueries({ queryKey: ['platform-llm-models'] });
  };

  const deleteModel = async (m: LlmModel) => {
    if (!window.confirm(`Delete "${m.label}"? This cannot be undone.`)) return;
    const { error } = await supabase
      .from('platform_llm_models' as any)
      .delete()
      .eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${m.label} deleted`);
    qc.invalidateQueries({ queryKey: ['platform-llm-models'] });
  };

  const visible = showInactive ? models : models.filter((m) => m.is_active);
  const byProvider = PROVIDERS.reduce((acc, p) => {
    acc[p] = visible.filter((m) => m.provider === p);
    return acc;
  }, {} as Record<string, LlmModel[]>);

  // Action costs that use each model
  const usageMap = costs.reduce((acc, c) => {
    acc[c.model] = (acc[c.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Manage the LLM model registry. Active models can be assigned to any AI action.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} className="scale-75" />
            Show disabled
          </label>
          <Button size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Model
          </Button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {PROVIDERS.map((provider) => {
        const rows = byProvider[provider] || [];
        if (rows.length === 0) return null;
        return (
          <div key={provider}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${PROVIDER_COLORS[provider] || PROVIDER_COLORS.Other}`}>{provider}</Badge>
              <span className="text-xs text-muted-foreground">{rows.length} model{rows.length !== 1 ? 's' : ''}</span>
            </div>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-2 text-xs">Model ID</th>
                    <th className="px-4 py-2 text-xs">Label</th>
                    <th className="px-4 py-2 text-xs">Vision</th>
                    <th className="px-4 py-2 text-xs">Used by</th>
                    <th className="px-4 py-2 text-xs">API Key</th>
                    <th className="px-4 py-2 text-xs">Test</th>
                    <th className="px-4 py-2 text-xs">Status</th>
                    <th className="px-4 py-2 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className={`border-t hover:bg-muted/20 ${!m.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5"><code className="text-xs">{m.model_id}</code></td>
                      <td className="px-4 py-2.5 text-xs font-medium">{m.label}{m.notes && <p className="text-[10px] text-muted-foreground">{m.notes}</p>}</td>
                      <td className="px-4 py-2.5 text-xs">{m.supports_vision ? <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">Vision</Badge> : '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {usageMap[m.model_id] ? (
                          <Badge variant="secondary" className="text-[10px]">{usageMap[m.model_id]} action{usageMap[m.model_id] !== 1 ? 's' : ''}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {m.api_key
                            ? <Badge className="text-[10px] bg-green-100 text-green-700">Key set</Badge>
                            : <span className="text-[10px] text-muted-foreground">No key</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><ModelTestButton model={m} /></td>
                      <td className="px-4 py-2.5">
                        <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditTarget(m); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteModel(m)} className="text-muted-foreground hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}

      {/* Action costs — inline model editor */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Zap className="h-4 w-4" /> Assign Models to AI Actions</h3>
        <p className="text-xs text-muted-foreground mb-3">Change which LLM model each action uses. Click the pencil icon on the model column to reassign.</p>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs">Action Key</th>
                <th className="px-4 py-2 text-xs">Model (click ✏️ to change)</th>
                <th className="px-4 py-2 text-xs">Credits</th>
                <th className="px-4 py-2 text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.action_key} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2"><code className="text-xs">{c.action_key}</code></td>
                  <td className="px-4 py-2"><ActionCostModelCell row={c} models={models} /></td>
                  <td className="px-4 py-2 text-xs font-mono">{c.credits_cost}</td>
                  <td className="px-4 py-2"><Badge variant="secondary" className={c.is_active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-red-100 text-red-700 text-[10px]'}>{c.is_active ? 'Active' : 'Off'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <ModelFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null); }} initial={editTarget} />
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminAIHealth = () => {
  const { data: logs = [] } = useCallLog();
  const { data: models = [] } = useLlmModels();
  const { data: costs = [] } = useActionCosts();

  const totalFunctions = AI_FUNCTIONS.length;
  const apisUsed = ['NVIDIA', 'Pollinations'] as ApiName[];
  const uniqueModels = [...new Set(AI_FUNCTIONS.flatMap((f) => f.models))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> AI Health Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor all AI/LLM integrations — which APIs are connected, which models are in use, live connectivity tests, and call logs.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'AI-Powered Functions', value: totalFunctions, icon: Zap },
          { label: 'APIs Connected', value: apisUsed.length, icon: Globe },
          { label: 'Unique Models', value: uniqueModels.length, icon: Cpu },
          { label: 'Logged Calls (recent)', value: logs.length, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3 w-3" />{label}
            </div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="functions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="functions" className="gap-1.5 text-xs"><Zap className="h-3 w-3" /> Functions</TabsTrigger>
          <TabsTrigger value="models" className="gap-1.5 text-xs"><Cpu className="h-3 w-3" /> Models</TabsTrigger>
        </TabsList>

        {/* ── Functions Tab ── */}
        <TabsContent value="functions" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">AI Feature & Model Mapping Registry</h2>
            <p className="text-xs text-muted-foreground">
              A comprehensive directory mapping platform features and user actions to the active AI/LLM models serving them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURE_MAPPING.map((feat, fIdx) => {
              const dbCostRow = costs.find(c => c.action_key === feat.actionKey);
              
              // Get assigned primary/fallback model IDs from DB row if found, else default
              const primaryModelId = dbCostRow?.model || feat.primaryModelId;
              const fallbackModelId = dbCostRow ? dbCostRow.fallback_model : feat.fallbackModelId;

              // Look up active LLM model objects for testing
              const primaryModelObj = models.find(m => m.model_id === primaryModelId);
              const fallbackModelObj = fallbackModelId ? models.find(m => m.model_id === fallbackModelId) : null;
              
              const qc = useQueryClient();

              return (
                <Card key={fIdx} className="overflow-hidden border border-slate-200 shadow-sm hover:shadow transition-shadow">
                  <CardHeader className="bg-slate-50/50 pb-2.5 border-b">
                    <div className="flex flex-col gap-1.5 md:flex-row md:justify-between md:items-center">
                      <CardTitle className="text-xs font-bold text-slate-800">{feat.title}</CardTitle>
                      <Badge variant="outline" className="text-[9px] bg-white text-indigo-700 border-indigo-200 whitespace-nowrap self-start md:self-auto">
                        {feat.place}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feat.purpose}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2.5 border-t text-[11px]">
                      {/* Primary Model Section */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Primary Model</span>
                          {primaryModelObj && (
                            <div className="scale-75 origin-right">
                              <ModelTestButton model={primaryModelObj} />
                            </div>
                          )}
                        </div>
                        <Select
                          value={primaryModelId}
                          onValueChange={async (newModelId) => {
                            const { error } = await supabase
                              .from('ai_action_costs' as any)
                              .update({ model: newModelId })
                              .eq('action_key', feat.actionKey);
                            if (error) {
                              toast.error(`Failed to update primary model: ${error.message}`);
                            } else {
                              toast.success(`Primary model updated for ${feat.title}`);
                              qc.invalidateQueries({ queryKey: ['admin-action-costs-ai'] });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-full mt-1 bg-white border">
                            <SelectValue placeholder="Select primary model" />
                          </SelectTrigger>
                          <SelectContent>
                            {models.filter(m => m.is_active).map(m => (
                              <SelectItem key={m.model_id} value={m.model_id} className="text-[10px]">
                                {m.label} ({m.provider})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fallback Model Section */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Fallback Model</span>
                          {fallbackModelObj && (
                            <div className="scale-75 origin-right">
                              <ModelTestButton model={fallbackModelObj} />
                            </div>
                          )}
                        </div>
                        <Select
                          value={fallbackModelId || "none"}
                          onValueChange={async (newModelId) => {
                            const dbVal = newModelId === "none" ? null : newModelId;
                            const { error } = await supabase
                              .from('ai_action_costs' as any)
                              .update({ fallback_model: dbVal })
                              .eq('action_key', feat.actionKey);
                            if (error) {
                              toast.error(`Failed to update fallback model: ${error.message}`);
                            } else {
                              toast.success(`Fallback model updated for ${feat.title}`);
                              qc.invalidateQueries({ queryKey: ['admin-action-costs-ai'] });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-full mt-1 bg-white border">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-[10px]">None (Disabled)</SelectItem>
                            {models.filter(m => m.is_active && m.model_id !== primaryModelId).map(m => (
                              <SelectItem key={m.model_id} value={m.model_id} className="text-[10px]">
                                {m.label} ({m.provider})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-1 pt-4">
            <h2 className="text-sm font-semibold">Underlying Edge Functions (Technical)</h2>
            <p className="text-xs text-muted-foreground">
              Technical registry of platform microservices, underlying API endpoints, execution costs, and logged events.
            </p>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-2">Function</th>
                  <th className="px-4 py-2">API(s)</th>
                  <th className="px-4 py-2">Model(s)</th>
                  <th className="px-4 py-2">Logged?</th>
                  <th className="px-4 py-2">Usage</th>
                </tr>
              </thead>
              <tbody>
                {AI_FUNCTIONS.map((fn) => <FunctionRow key={fn.name} fn={fn} logRows={logs} />)}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* ── Models Tab ── */}
        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAIHealth;
