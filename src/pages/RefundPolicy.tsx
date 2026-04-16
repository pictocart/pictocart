const RefundPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Platform Subscription Refunds</h2>
          <p>If you are unsatisfied with your premium subscription, you may request a full refund within 7 days of purchase. After 7 days, refunds are prorated based on remaining subscription period. Contact support to initiate a refund.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Theme Purchases</h2>
          <p>Premium theme purchases are non-refundable once applied to a store, as the AI-generated content is unique and cannot be resold. If a theme fails to render correctly due to a platform bug, we will either fix the issue or provide a replacement theme at no cost.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Product Purchases (Store Customers)</h2>
          <p>Refund policies for products purchased from individual stores are set by each seller. Pic to Cart acts as a platform provider and does not directly handle product refunds. Customers should contact the store seller directly for return and refund requests.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. How to Request a Refund</h2>
          <p>To request a platform refund, email <a href="mailto:support@storeontips.com" className="text-primary hover:underline">support@storeontips.com</a> with your account details and reason for the refund. We will process eligible refunds within 5-7 business days to your original payment method.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Exceptions</h2>
          <p>Refunds will not be granted for accounts terminated due to violation of our Terms of Service, or for services already fully consumed (e.g., AI credits used, domains configured).</p>
        </section>
      </div>
    </div>
  </div>
);

export default RefundPolicy;
