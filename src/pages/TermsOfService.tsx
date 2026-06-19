const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using Pic to Cart ("Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>Pic to Cart provides a software-as-a-service platform that enables merchants ("Sellers") to create and manage online stores, and allows end users ("Customers") to browse and purchase products from those stores.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Seller Responsibilities</h2>
          <p>Sellers are responsible for the accuracy of product listings, fulfillment of orders, compliance with applicable laws (including GST regulations), and providing honest product descriptions. Sellers must not sell prohibited or illegal items.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Convenience Fee</h2>
          <p>Pic to Cart charges a 2% convenience fee on each transaction processed through the platform. Additional fees may apply for premium features as outlined in our pricing page.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Payments & Billing</h2>
          <p>Payments are processed through Razorpay. Sellers are responsible for configuring their own payment gateway credentials. Pic to Cart is not liable for payment processing failures caused by third-party services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
          <p>Content uploaded by sellers remains their intellectual property. Pic to Cart retains ownership of the platform's design, code, and branding. AI-generated content (product descriptions, themes) is licensed for use within the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Account Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or remain inactive for extended periods. Sellers may close their accounts at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>Pic to Cart is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from the use of our platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of courts in Bangalore, Karnataka.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:legal@storeontips.com" className="text-primary hover:underline">legal@storeontips.com</a>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;
