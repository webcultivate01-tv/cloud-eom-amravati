import Reveal, { RevealGroup } from "../components/Reveal";

export default function ReturnPolicy() {
  return (
    <div className="bg-white min-h-screen py-12 px-6 md:px-16 lg:px-24">
      <div className="max-w-6xl mx-auto">

        <Reveal>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Return Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: June 2025</p>
        </Reveal>

        <RevealGroup stagger={70} className="space-y-8 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">1. Custom Products</h2>
            <p>Since all our products are <span className="font-semibold text-gray-700">custom-printed to order</span>, we generally do not accept returns or exchanges unless the product is defective, damaged, or incorrect due to our error.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">2. Eligible Returns</h2>
            <p>You are eligible for a return or replacement if:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The product received is damaged or broken</li>
              <li>The print quality is significantly different from what was ordered</li>
              <li>You received a wrong product</li>
              <li>The product has a manufacturing defect</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">3. Non-Eligible Returns</h2>
            <p>Returns will NOT be accepted in the following cases:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Customer uploaded a low-quality or incorrect image</li>
              <li>Change of mind after order placement</li>
              <li>Minor color variations due to screen vs. print differences</li>
              <li>Product used or tampered with after delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">4. How to Request a Return</h2>
            <p>To initiate a return or replacement:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Contact us within <span className="font-semibold text-gray-700">48 hours</span> of delivery</li>
              <li>Email us at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span> with your order number</li>
              <li>Attach clear photos of the defective/damaged product</li>
              <li>Our team will review and respond within 24–48 hours</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">5. Refund Process</h2>
            <p>Once your return is approved:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><span className="font-semibold text-gray-700">Replacement:</span> New product dispatched within 3–5 business days</li>
              <li><span className="font-semibold text-gray-700">Refund:</span> Processed to original payment method within 5–7 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">6. Cancellation Policy</h2>
            <p>Orders can be cancelled within <span className="font-semibold text-gray-700">2 hours</span> of placement, provided production has not started. Once printing begins, cancellation is not possible. Contact us immediately at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span> to request cancellation.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">7. Contact Us</h2>
            <p>For return/refund queries, reach us at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span> or call <span className="font-semibold">+91 93076 41746</span>. Business hours: Mon–Sat, 10 AM – 7 PM.</p>
          </section>

        </RevealGroup>
      </div>
    </div>
  );
}
