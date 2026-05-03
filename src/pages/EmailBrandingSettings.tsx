import { useStore } from '@/hooks/useStore';
import StepEmailBranding from '@/components/onboarding/StepEmailBranding';
import { Card, CardContent } from '@/components/ui/card';

const EmailBrandingSettings = () => {
  const { store } = useStore();
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Branding</h1>
        <p className="text-sm text-muted-foreground">
          Customise the order, shipping and welcome emails customers receive from {store?.name || 'your store'}.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {/* Re-using onboarding step component as the standalone settings page */}
          <StepEmailBranding
            data={{
              storeName: store?.name || '',
              slug: store?.slug || '',
              description: '',
              category: store?.category || '',
              logoUrl: store?.logo_url || '',
              selectedThemeId: '',
              productImageUrl: '',
              productImageFile: null,
              aiProduct: null,
              storeInfo: { phone: '', city: '', gst: '' },
              paymentSettings: { cod: true, upi: false, razorpay: false },
              emailTemplatesGenerated: false,
              slugAvailable: true,
            }}
            setData={() => {}}
            storeId={store?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailBrandingSettings;
