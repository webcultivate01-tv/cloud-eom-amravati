/* Razorpay's checkout script is only needed on the checkout page, so it is
   fetched on demand instead of blocking every page load from index.html. */
const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let pending = null;

export function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      pending = null; // allow a retry
      script.remove();
      reject(new Error("Razorpay failed to load"));
    };
    document.head.appendChild(script);
  });
  return pending;
}
