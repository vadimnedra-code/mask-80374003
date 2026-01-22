import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground">Last updated: January 22, 2025</p>

        <section className="mt-8">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using Mask Messenger ("the App"), you agree to be bound 
            by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
          </p>
        </section>

        <section className="mt-6">
          <h2>2. Description of Service</h2>
          <p>
            Mask Messenger is a secure messaging application that provides end-to-end encrypted 
            communication services, including:
          </p>
          <ul>
            <li>Text messaging</li>
            <li>Voice messages</li>
            <li>Media sharing (photos, videos, files)</li>
            <li>Voice and video calls</li>
            <li>Group chats</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>3. Account Registration</h2>
          <p>
            To use certain features of the App, you must create an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>4. Acceptable Use</h2>
          <p>You agree NOT to use the App to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Send spam, unsolicited messages, or malware</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Share illegal, harmful, or offensive content</li>
            <li>Impersonate others or misrepresent your identity</li>
            <li>Attempt to access other users' accounts</li>
            <li>Interfere with or disrupt the App's functionality</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>5. User Content</h2>
          <p>
            You retain ownership of content you share through the App. By using the App, you grant 
            us a limited license to transmit and store your content as necessary to provide the service.
          </p>
          <p>
            Due to end-to-end encryption, we cannot access the content of your messages. You are 
            solely responsible for the content you share.
          </p>
        </section>

        <section className="mt-6">
          <h2>6. Privacy</h2>
          <p>
            Your privacy is important to us. Our <a href="/privacy" className="text-primary">Privacy Policy</a> explains 
            how we collect, use, and protect your information. By using the App, you consent to our 
            data practices as described in the Privacy Policy.
          </p>
        </section>

        <section className="mt-6">
          <h2>7. Intellectual Property</h2>
          <p>
            The App and its original content, features, and functionality are owned by Mask Messenger 
            and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mt-6">
          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice, if you 
            breach these Terms. Upon termination:
          </p>
          <ul>
            <li>Your right to use the App ceases immediately</li>
            <li>We may delete your account and associated data</li>
            <li>Provisions that should survive termination will remain in effect</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>9. Disclaimers</h2>
          <p>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. 
            WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
          </p>
          <ul>
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Non-infringement of third-party rights</li>
            <li>Uninterrupted or error-free service</li>
            <li>Security or reliability of communications</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Loss of data or content</li>
            <li>Loss of profits or revenue</li>
            <li>Personal injury or property damage</li>
            <li>Unauthorized access to your data</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Mask Messenger and its affiliates from any 
            claims, damages, or expenses arising from your use of the App or violation of these Terms.
          </p>
        </section>

        <section className="mt-6">
          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of 
            significant changes. Continued use of the App after changes constitutes acceptance 
            of the new Terms.
          </p>
        </section>

        <section className="mt-6">
          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws, 
            without regard to conflict of law principles.
          </p>
        </section>

        <section className="mt-6">
          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p className="text-muted-foreground">
            Email: legal@maskmessenger.app
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfService;
