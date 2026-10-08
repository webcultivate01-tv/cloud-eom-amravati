import Reveal, { RevealGroup } from "../components/Reveal";

export default function TermsConditions() {
  return (
    <div className="bg-white min-h-screen py-12 px-6 md:px-16 lg:px-24">
      <div className="max-w-6xl mx-auto">

        <Reveal>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Terms & Conditions</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: June 2025</p>
        </Reveal>

        <RevealGroup stagger={70} className="space-y-8 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or placing an order on Cloud Graphics Amravati, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">2. Products & Customization</h2>
            <p>All products are custom-printed based on the designs and details provided by you. It is your responsibility to ensure that the uploaded images and text are accurate, high-resolution, and free from copyright issues. Cloud Graphics is not liable for errors in customer-provided content.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">3. Order Confirmation</h2>
            <p>An order is confirmed only after successful payment. We reserve the right to cancel any order in case of pricing errors, stock unavailability, or suspected fraudulent activity. You will be notified and fully refunded in such cases.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">4. Pricing & Payments</h2>
            <p>All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. We accept payments via Razorpay (UPI, cards, net banking). Prices are subject to change without prior notice.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">5. Intellectual Property</h2>
            <p>All content on this website including logos, images, and text is the property of Cloud Graphics Amravati. You may not reproduce or use any content without written permission. By uploading your design, you confirm you have the rights to use it.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">6. Limitation of Liability</h2>
            <p>Cloud Graphics shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services. Our maximum liability is limited to the order value paid by you.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">7. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Amravati, Maharashtra.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">8. Contact Us</h2>
            <p>For any queries regarding these terms, reach us at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span> or call <span className="font-semibold">+91 93076 41746</span>.</p>
          </section>

        </RevealGroup>
      </div>
    </div>
  );
}
