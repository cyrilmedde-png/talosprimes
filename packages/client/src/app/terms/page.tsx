'use client';

import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function TermsOfServicePage() {
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={today}>
      <LegalSection number="1" title="Acceptance of Terms">
        <p>
          By accessing and using the TalosPrimes platform (&quot;Service&quot;), you agree to be bound by these
          Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
        </p>
      </LegalSection>

      <LegalSection number="2" title="Description of Service">
        <p>
          TalosPrimes is a business management and marketing automation platform that provides tools for
          social media content management, automated publishing, client management, invoicing, and
          business analytics. The platform integrates with third-party services including but not limited
          to Facebook, Instagram, TikTok, and other social media platforms.
        </p>
      </LegalSection>

      <LegalSection number="3" title="User Accounts">
        <p>
          To use the Service, you must create an account and provide accurate, complete information.
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activities that occur under your account. You must notify us immediately of any unauthorized
          use of your account.
        </p>
      </LegalSection>

      <LegalSection number="4" title="Authorized Use">
        <p>
          You agree to use the Service only for lawful purposes and in accordance with these Terms.
          You shall not use the Service to publish content that is illegal, harmful, threatening,
          abusive, defamatory, or otherwise objectionable. You are solely responsible for all content
          published through the Service via your account.
        </p>
      </LegalSection>

      <LegalSection number="5" title="Third-Party Integrations">
        <p>
          The Service integrates with third-party platforms (e.g., TikTok, Facebook, Instagram) to
          enable automated content publishing. Your use of these integrations is also subject to the
          respective terms of service and policies of those third-party platforms. TalosPrimes is not
          responsible for any changes, restrictions, or actions taken by third-party platforms.
        </p>
      </LegalSection>

      <LegalSection number="6" title="Intellectual Property">
        <p>
          All content, features, and functionality of the Service, including but not limited to text,
          graphics, logos, and software, are the exclusive property of TalosPrimes SaaS. You retain
          ownership of any content you create or upload through the Service.
        </p>
      </LegalSection>

      <LegalSection number="7" title="Limitation of Liability">
        <p>
          TalosPrimes SaaS shall not be liable for any indirect, incidental, special, consequential,
          or punitive damages resulting from your use of the Service. The Service is provided &quot;as is&quot;
          without warranties of any kind, either express or implied.
        </p>
      </LegalSection>

      <LegalSection number="8" title="Termination">
        <p>
          We reserve the right to suspend or terminate your access to the Service at any time, with
          or without notice, for conduct that we believe violates these Terms or is harmful to other
          users, us, or third parties, or for any other reason at our sole discretion.
        </p>
      </LegalSection>

      <LegalSection number="9" title="Modifications">
        <p>
          We reserve the right to modify these Terms at any time. Updated Terms will be posted on this
          page with a revised date. Your continued use of the Service after any changes constitutes
          acceptance of the new Terms.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of France.
          Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of
          the French courts.
        </p>
      </LegalSection>

      <LegalSection number="11" title="Contact">
        <p>For any questions regarding these Terms of Service, please contact us:</p>
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Email: contact@talosprimes.com</li>
          <li>Website: https://talosprimes.com</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
