const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>When you create a store or make a purchase on Pic to Cart, we collect personal information such as your name, email address, phone number, billing address, and payment details. We also collect usage data including pages visited, features used, and device information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our services, process transactions, send transactional communications (order confirmations, shipping updates), and ensure platform security. We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Data Storage & Security</h2>
          <p>Your data is stored securely on encrypted servers. We implement industry-standard security measures including SSL encryption, secure authentication, and regular security audits to protect your information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Third-Party Services</h2>
          <p>We use third-party services including payment processors (Razorpay), shipping providers (Delhivery), and analytics tools. These services have their own privacy policies governing data use. We share only the minimum data necessary to provide our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
          <p>We use essential cookies for authentication and session management. We may use analytics cookies to understand usage patterns and improve our platform. You can disable non-essential cookies in your browser settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal data at any time. You can export your store data or request account deletion by contacting our support team. We will process your request within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
          <p>For any privacy-related questions or concerns, please contact us at <a href="mailto:privacy@storeontips.com" className="text-primary hover:underline">privacy@storeontips.com</a>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
