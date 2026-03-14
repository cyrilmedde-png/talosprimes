'use client';

import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function PrivacyPolicyPage() {
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={today}>
      <LegalSection number="1" title="Introduction">
        <p>
          TalosPrimes SaaS (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting
          your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
          information when you use our platform and services.
        </p>
      </LegalSection>

      <LegalSection number="2" title="Information We Collect">
        <p>We may collect the following types of information:</p>
        <ul className="list-disc list-inside space-y-1.5 ml-1 mt-2">
          <li><strong className="text-slate-800">Account Information:</strong> Name, email address, and credentials when you create an account.</li>
          <li><strong className="text-slate-800">Business Data:</strong> Information related to your business operations that you input into the platform.</li>
          <li><strong className="text-slate-800">Social Media Data:</strong> When you connect third-party accounts (TikTok, Facebook, Instagram), we access only the data necessary to provide our publishing services, such as your public profile information and content publishing permissions.</li>
          <li><strong className="text-slate-800">Usage Data:</strong> Information about how you interact with our Service, including log data and device information.</li>
        </ul>
      </LegalSection>

      <LegalSection number="3" title="How We Use Your Information">
        <p>We use your information to:</p>
        <ul className="list-disc list-inside space-y-1.5 ml-1 mt-2">
          <li>Provide, maintain, and improve our Service</li>
          <li>Publish content on your behalf to connected social media platforms</li>
          <li>Send you service-related communications</li>
          <li>Ensure the security of your account and our platform</li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="Third-Party Services">
        <p>
          Our Service integrates with third-party platforms including TikTok, Facebook, and Instagram.
          When you authorize these connections, we access your account through official APIs using OAuth
          authentication. We only request the minimum permissions necessary to provide our services
          (e.g., video publishing, basic profile information). We do not sell or share your social media
          data with any other third parties.
        </p>
      </LegalSection>

      <LegalSection number="5" title="Data Storage and Security">
        <p>
          Your data is stored on secure servers hosted in Europe. We implement appropriate technical
          and organizational measures to protect your personal data against unauthorized access,
          alteration, disclosure, or destruction. Access tokens for third-party services are stored
          securely and are only used for their intended purpose.
        </p>
      </LegalSection>

      <LegalSection number="6" title="Data Retention">
        <p>
          We retain your personal data only for as long as necessary to provide our services and
          fulfill the purposes described in this policy. When you delete your account, we will delete
          or anonymize your personal data within 30 days, except where we are required by law to
          retain certain information.
        </p>
      </LegalSection>

      <LegalSection number="7" title="Your Rights (GDPR)">
        <p>
          Under the General Data Protection Regulation (GDPR), you have the following rights:
        </p>
        <ul className="list-disc list-inside space-y-1.5 ml-1 mt-2">
          <li><strong className="text-slate-800">Right of Access:</strong> Request a copy of your personal data.</li>
          <li><strong className="text-slate-800">Right to Rectification:</strong> Request correction of inaccurate data.</li>
          <li><strong className="text-slate-800">Right to Erasure:</strong> Request deletion of your personal data.</li>
          <li><strong className="text-slate-800">Right to Restriction:</strong> Request limitation of data processing.</li>
          <li><strong className="text-slate-800">Right to Portability:</strong> Request transfer of your data in a machine-readable format.</li>
          <li><strong className="text-slate-800">Right to Object:</strong> Object to data processing based on legitimate interests.</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, please contact us at <strong className="text-slate-800">rgpd@talosprimes.com</strong>.
        </p>
      </LegalSection>

      <LegalSection number="8" title="Cookies">
        <p>
          Our Service uses essential cookies to ensure proper functionality and security. We may also
          use analytics cookies to understand how users interact with our platform. You can manage
          cookie preferences through your browser settings.
        </p>
      </LegalSection>

      <LegalSection number="9" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any significant
          changes by posting the new policy on this page with an updated revision date. Your continued
          use of the Service after changes are posted constitutes acceptance of the revised policy.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Contact">
        <p>For any questions regarding this Privacy Policy or your personal data, please contact us:</p>
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Email: rgpd@talosprimes.com</li>
          <li>General inquiries: contact@talosprimes.com</li>
          <li>Website: https://talosprimes.com</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
