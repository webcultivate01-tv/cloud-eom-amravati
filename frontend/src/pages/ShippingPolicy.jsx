import Reveal, { RevealGroup } from "../components/Reveal";

export default function ShippingPolicy() {
  return (
    <div className="bg-white min-h-screen py-12 px-6 md:px-16 lg:px-24">
      <div className="max-w-6xl mx-auto">

        <Reveal>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Shipping Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: June 2025</p>
        </Reveal>

        <RevealGroup stagger={70} className="space-y-8 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">1. Processing Time</h2>
            <p>All orders are custom-printed and require <span className="font-semibold text-gray-700">2–4 business days</span> for production before dispatch. Orders placed on weekends or public holidays will be processed the next business day.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">2. Delivery Time</h2>
            <p>After dispatch, estimated delivery times are:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><span className="font-semibold text-gray-700">Amravati & nearby areas:</span> 1–2 business days</li>
              <li><span className="font-semibold text-gray-700">Maharashtra:</span> 2–4 business days</li>
              <li><span className="font-semibold text-gray-700">Rest of India:</span> 4–7 business days</li>
            </ul>
            <p className="mt-2">Delivery timelines are estimates and may vary due to courier delays, weather, or public holidays.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">3. Shipping Charges</h2>
            <p>Shipping charges are calculated at checkout based on your location and order weight. We offer <span className="font-semibold text-gray-700">free shipping</span> on orders above a certain value (as displayed at checkout).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">4. Tracking Your Order</h2>
            <p>Once your order is dispatched, you will receive a tracking number via email/SMS. You can use this to track your shipment on the courier's website or via your Order History page.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">5. Delivery Address</h2>
            <p>Please ensure your delivery address is complete and accurate at the time of placing the order. Cloud Graphics is not responsible for delays or non-delivery due to incorrect address information provided by the customer.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">6. Damaged in Transit</h2>
            <p>If your order arrives damaged, please take photos immediately and contact us within <span className="font-semibold text-gray-700">48 hours</span> of delivery at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span>. We will arrange a replacement or refund after verification.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-800 mb-2">7. Contact Us</h2>
            <p>For shipping-related queries, contact us at <span className="text-[#05618e] font-semibold">info@cloudgraphics.in</span> or call <span className="font-semibold">+91 93076 41746</span>.</p>
          </section>

        </RevealGroup>
      </div>
    </div>
  );
}
