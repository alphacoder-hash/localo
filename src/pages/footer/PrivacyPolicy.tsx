export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2 border-b pb-4">
        <h1 className="font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: January 20, 2026</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We collect information you provide directly to us, such as when you create an account, 
          update your profile, place an order, or communicate with us. This may include:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Name, email address, and phone number</li>
          <li>Location data (for vendor discovery and delivery)</li>
          <li>Order history and preferences</li>
          <li>Vendor business details and verification documents</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Detect, investigate, and prevent fraudulent transactions</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
        <p className="text-muted-foreground">
          We may share your information with vendors to fulfill your orders. We do not sell your 
          personal data to third parties. We may share information for legal reasons or in the 
          event of a business transfer.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Data Security</h2>
        <p className="text-muted-foreground">
          We use reasonable measures to help protect information about you from loss, theft, misuse, 
          and unauthorized access, disclosure, alteration, and destruction.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions about this Privacy Policy, please contact us at: 
          <a href="mailto:privacy@nearnow.com" className="ml-1 text-primary hover:underline">
            privacy@nearnow.com
          </a>
        </p>
      </section>
    </div>
  );
}
