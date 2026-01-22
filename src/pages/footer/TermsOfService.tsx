export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2 border-b pb-4">
        <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: January 20, 2026</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By accessing or using NearNow, you agree to be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use our services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Description of Service</h2>
        <p className="text-muted-foreground">
          NearNow connects users with local vendors. We act as a platform for discovery and 
          ordering but are not a party to the actual transaction between buyers and sellers. 
          Vendors are solely responsible for their products and services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. User Accounts</h2>
        <p className="text-muted-foreground">
          You are responsible for maintaining the confidentiality of your account and password. 
          You agree to accept responsibility for all activities that occur under your account.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Vendor Guidelines</h2>
        <p className="text-muted-foreground">
          Vendors must provide accurate information about their products, prices, and location. 
          Prohibited items include illegal goods, hazardous materials, and adult content. 
          We reserve the right to remove any vendor violating these guidelines.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Limitation of Liability</h2>
        <p className="text-muted-foreground">
          NearNow shall not be liable for any indirect, incidental, special, consequential, or 
          punitive damages resulting from your use of or inability to use the service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Changes to Terms</h2>
        <p className="text-muted-foreground">
          We reserve the right to modify these terms at any time. We will notify users of any 
          significant changes. Your continued use of the service constitutes acceptance of the new terms.
        </p>
      </section>
    </div>
  );
}
