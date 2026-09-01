import PublicPageLayout, { InfoSection } from '../components/PublicPageLayout.jsx'

export default function RefundPolicy() {
  return <PublicPageLayout eyebrow="Payments" title="Cancellation and Refund Policy" intro="A clear explanation of how to cancel an eligible paid-package purchase and receive a refund.">
    <p className="text-sm text-ink/55">Effective date: 1 September 2026</p>
    <InfoSection title="48-hour cancellation window"><p>You may request cancellation of a paid package within 48 hours of the recorded purchase time by writing to <a className="underline" href="mailto:contact@tenthkipadhai.online">contact@tenthkipadhai.online</a>. Eligibility within this period is not affected merely because the student has taken a test, viewed content or downloaded available material.</p></InfoSection>
    <InfoSection title="How to request a cancellation"><p>Use the subject “Package Cancellation” and include the student’s registered email address, package name, purchase date, Razorpay payment or order reference, and a short reason for the request. We may ask for reasonable information to verify the account and transaction.</p></InfoSection>
    <InfoSection title="Refund amount and timing"><p>An approved request receives a full refund of the eligible purchase amount to the original payment method. We initiate approved refunds promptly; they normally appear within 7–10 business days. The final credit time may vary due to Razorpay, the bank, card network or UPI provider.</p></InfoSection>
    <InfoSection title="After cancellation"><p>Access supplied by the refunded package may be withdrawn when the cancellation is approved. Free trials do not involve a monetary payment and therefore have no refundable amount. Each upgrade or other paid purchase is treated as a separate transaction for the 48-hour period.</p></InfoSection>
    <InfoSection title="Requests after 48 hours"><p>Paid packages are generally non-refundable after the 48-hour cancellation period. This does not limit any refund, correction or other remedy required by applicable law, including for duplicate charges, an incorrect amount or a payment taken without the corresponding package being supplied.</p></InfoSection>
    <InfoSection title="Need help?"><p>Contact customer care at <a className="underline" href="mailto:contact@tenthkipadhai.online">contact@tenthkipadhai.online</a>, +91 96041 88725 or +91 96041 88726. Tenth Ki Padhai is operated by Tracksoft Solutions Private Limited.</p></InfoSection>
  </PublicPageLayout>
}
