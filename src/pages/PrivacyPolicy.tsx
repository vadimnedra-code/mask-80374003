import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground">Last updated: January 22, 2025</p>

        <section className="mt-8">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Mask Messenger ("we," "our," or "us"). We are committed to protecting your privacy 
            and ensuring the security of your personal information. This Privacy Policy explains how we 
            collect, use, disclose, and safeguard your information when you use our mobile application.
          </p>
        </section>

        <section className="mt-6">
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Display name and profile picture (optional)</li>
            <li><strong>Messages:</strong> Text messages, voice messages, and media files you send</li>
            <li><strong>Contacts:</strong> Information about people you communicate with</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers</li>
            <li><strong>Usage Data:</strong> App features used, interaction timestamps</li>
            <li><strong>Log Data:</strong> Error logs and diagnostic information</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>3. End-to-End Encryption</h2>
          <p>
            Mask Messenger uses end-to-end encryption (E2EE) for all messages. This means:
          </p>
          <ul>
            <li>Only you and the recipient can read your messages</li>
            <li>We cannot access the content of your encrypted communications</li>
            <li>Your encryption keys are stored securely on your device</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>4. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the messaging service</li>
            <li>To enable communication between users</li>
            <li>To improve and optimize the application</li>
            <li>To detect and prevent fraud or abuse</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>5. Data Storage and Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your data:
          </p>
          <ul>
            <li>All data is transmitted over secure, encrypted connections (TLS)</li>
            <li>Messages are end-to-end encrypted</li>
            <li>Media files are stored in private, access-controlled storage</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>6. Data Retention</h2>
          <p>
            We retain your data only for as long as necessary to provide our services:
          </p>
          <ul>
            <li>Account data is retained while your account is active</li>
            <li>Messages may have disappearing message timers set by users</li>
            <li>You can delete your account at any time, which removes all associated data</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Object to certain processing activities</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2>8. Third-Party Services</h2>
          <p>
            We may use third-party services for analytics and crash reporting. These services 
            have their own privacy policies and data practices.
          </p>
        </section>

        <section className="mt-6">
          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not intended for users under the age of 13. We do not knowingly 
            collect personal information from children under 13.
          </p>
        </section>

        <section className="mt-6">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mt-6">
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-muted-foreground">
            Email: privacy@maskmessenger.app
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
