import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Sparkles, Copy, Check, Send, AlertCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGNS = [
  { value: 'abandoned_cart', label: 'Abandoned Cart Recovery', desc: 'Remind users who left products in their checkout cart.' },
  { value: 'festival_discount', label: 'Festive / Seasonal Promo', desc: 'Promote discounts for Holi, Diwali, New Year, etc.' },
  { value: 'product_launch', label: 'New Product Launch', desc: 'Send announcements for new items added to your catalog.' },
  { value: 'welcome_offer', label: 'New Customer Welcome', desc: 'Greet new sign-ups with a unique discount code.' },
];

const LANGUAGES = [
  { value: 'hinglish', label: 'Hinglish (Hinglish/Conversational)' },
  { value: 'hindi', label: 'Hindi (हिंदी)' },
  { value: 'english', label: 'English (US/UK)' },
];

const MarketingCopywriter = () => {
  const { store } = useStore();
  const [campaign, setCampaign] = useState('abandoned_cart');
  const [language, setLanguage] = useState('hinglish');
  const [productName, setProductName] = useState('');
  const [discountDetails, setDiscountDetails] = useState('10% OFF');
  const [couponCode, setCouponCode] = useState('RECOVER10');
  const [generating, setGenerating] = useState(false);
  const [whatsappCopy, setWhatsappCopy] = useState('');
  const [smsCopy, setSmsCopy] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!store?.id) return;
    setGenerating(true);
    setWhatsappCopy('');
    setSmsCopy('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-marketing-copy', {
        body: {
          store_id: store.id,
          campaign_type: campaign,
          language,
          product_name: productName,
          discount_details: discountDetails,
          coupon_code: couponCode,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setWhatsappCopy(data.whatsapp || '');
      setSmsCopy(data.sms || '');
      toast.success('AI Marketing Copy generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, type: 'whatsapp' | 'sms') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-600 animate-pulse" />
          AI Marketing Copywriter
        </h1>
        <p className="text-sm text-muted-foreground">
          Write high-converting WhatsApp & SMS messages in English, Hinglish, and Hindi to boost your sales.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Details</CardTitle>
              <CardDescription>Configure your promotion guidelines below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campaign Type */}
              <div className="space-y-2">
                <Label>Campaign Goal</Label>
                <Select value={campaign} onValueChange={setCampaign}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGNS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {CAMPAIGNS.find((c) => c.value === campaign)?.desc}
                </p>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Output Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Product Name */}
              {(campaign === 'abandoned_cart' || campaign === 'product_launch') && (
                <div className="space-y-2">
                  <Label>Product Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Silk Saree, Leather Shoes"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
              )}

              {/* Offer details */}
              <div className="space-y-2">
                <Label>Discount / Incentive Details</Label>
                <Input
                  placeholder="e.g. 10% OFF, Free Shipping, Buy 1 Get 1"
                  value={discountDetails}
                  onChange={(e) => setDiscountDetails(e.target.value)}
                />
              </div>

              {/* Coupon Code */}
              <div className="space-y-2">
                <Label>Coupon Code (Optional)</Label>
                <Input
                  placeholder="e.g. FESTIVE20, WELCOME"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-semibold"
              >
                {generating ? 'Drafting messages...' : 'Generate Marketing Copy'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Output Screen */}
        <div className="lg:col-span-7 space-y-6">
          {whatsappCopy || smsCopy ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* WhatsApp Mock */}
              <Card className="border-emerald-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                    <span className="font-semibold text-sm">WhatsApp Draft</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-emerald-700"
                    onClick={() => handleCopy(whatsappCopy, 'whatsapp')}
                  >
                    {copiedType === 'whatsapp' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <CardContent className="flex-1 bg-[#efeae2] p-4 flex flex-col justify-between min-h-[300px]">
                  {/* WhatsApp chat bubble */}
                  <div className="bg-white rounded-lg p-3 text-sm shadow-sm space-y-2 relative border border-[#e1d9d0]">
                    <div className="whitespace-pre-line text-slate-800">{whatsappCopy}</div>
                    <span className="text-[10px] text-muted-foreground text-right block mt-1">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={() => handleCopy(whatsappCopy, 'whatsapp')}
                      variant="outline"
                      size="sm"
                      className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy WhatsApp Message
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* SMS Mock */}
              <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-sm">SMS Draft</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-slate-700"
                    onClick={() => handleCopy(smsCopy, 'sms')}
                  >
                    {copiedType === 'sms' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <CardContent className="flex-1 bg-slate-50 p-4 flex flex-col justify-between min-h-[300px]">
                  {/* SMS bubble */}
                  <div className="bg-blue-500 text-white rounded-2xl px-4 py-2.5 text-sm shadow-sm max-w-[85%] self-end">
                    <div className="whitespace-pre-line leading-relaxed">{smsCopy}</div>
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={() => handleCopy(smsCopy, 'sms')}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy SMS Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2">
              <div className="h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-violet-600" />
              </div>
              <h3 className="font-semibold text-base">Generate high-converting messages</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Configure your promotion criteria on the left, then click Generate to draft WhatsApp and SMS messages.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketingCopywriter;
