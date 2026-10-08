import { createSlice } from "@reduxjs/toolkit";

const MAX_QTY = 10000;

// Escape "%" and "_" so ids/sizes containing "__" can never produce the same key.
const esc = (v) => String(v ?? "").replace(/%/g, "%25").replace(/_/g, "%5F");

// Composite key — same product in different sizes are SEPARATE cart entries.
export const makeCartKey = (id, size) => `${esc(id)}__${esc(size)}`;

const isValidId = (id) =>
  (typeof id === "string" && id.trim() !== "") || (typeof id === "number" && Number.isFinite(id));
const isValidPrice = (p) => typeof p === "number" && Number.isFinite(p) && p >= 0;

// Accepts numbers and numeric strings; returns a whole number capped at MAX_QTY, or null if unusable.
const toQty = (q) => {
  if (typeof q === "string" && q.trim() !== "") q = Number(q);
  if (typeof q !== "number" || !Number.isFinite(q)) return null;
  return Math.min(Math.floor(q), MAX_QTY);
};

const isSafeImageUrl = (u) =>
  typeof u === "string" && /^(\/(?!\/)|https?:\/\/|data:image\/)/i.test(u.trim());

const isValidItem = (i) =>
  i && typeof i === "object" && isValidId(i._id) && toQty(i.quantity) > 0;

// Load cart from localStorage so it persists across refreshes.
// Corrupt / tampered data must never crash the app — fall back to an empty cart.
const loadCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("cart"));
    return Array.isArray(parsed) ? parsed.filter(isValidItem) : [];
  } catch {
    return [];
  }
};

// Storage can be full or blocked (private mode); the in-memory cart must keep working.
const saveCart = (items) => {
  try {
    localStorage.setItem("cart", JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadCart(),
  },
  reducers: {
    // Add item or increase quantity if same product+size is already in cart
    addToCart: (state, action) => {
      const p = action.payload;
      if (!p || !isValidId(p._id) || !isValidPrice(p.price)) return;
      const size = p.size ?? "";
      const asked = toQty(p.quantity ?? 1);
      const quantity = asked > 0 ? asked : 1;
      const key = makeCartKey(p._id, size);
      const existing = state.items.find((item) => makeCartKey(item._id, item.size) === key);
      if (existing) {
        existing.quantity = Math.min((toQty(existing.quantity) || 0) + quantity, MAX_QTY);
      } else {
        state.items.push({ ...p, size, quantity, cartKey: key });
      }
      saveCart(state.items);
    },

    // Remove a specific cart entry by its composite key
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => makeCartKey(item._id, item.size) !== action.payload);
      saveCart(state.items);
    },

    // Update quantity for a specific cart entry (identified by composite key)
    updateQuantity: (state, action) => {
      const { key, quantity } = action.payload || {};
      const item = state.items.find((i) => makeCartKey(i._id, i.size) === key);
      const q = toQty(quantity);
      if (item && q !== null) {
        if (q <= 0) {
          state.items = state.items.filter((i) => makeCartKey(i._id, i.size) !== key);
        } else {
          item.quantity = q;
        }
      }
      saveCart(state.items);
    },

    // Attach a custom image URL to a specific cart entry
    setItemImage: (state, action) => {
      const { key, imageUrl } = action.payload || {};
      const item = state.items.find((i) => makeCartKey(i._id, i.size) === key);
      if (item && isSafeImageUrl(imageUrl)) item.uploadedImage = imageUrl;
      saveCart(state.items);
    },

    clearCart: (state) => {
      state.items = [];
      try { localStorage.removeItem("cart"); } catch { /* ignore */ }
    },
  },
  extraReducers: (builder) => {
    // Logging out empties the cart too, so the next person on a shared device doesn't inherit it.
    builder.addCase("auth/logout", (state) => {
      state.items = [];
    });
  },
});

// Selectors
const num = (n) => (Number.isFinite(n) ? n : 0);

export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, item) => sum + num(item.price) * num(item.quantity), 0);

// Delivery is charged per unit, set per product by the admin (0 = free).
export const selectCartDelivery = (state) =>
  state.cart.items.reduce((sum, item) => sum + num(item.deliveryCharge) * num(item.quantity), 0);

// What the customer actually pays: product cost + delivery.
export const selectCartGrandTotal = (state) => selectCartTotal(state) + selectCartDelivery(state);

export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + num(item.quantity), 0);

export const { addToCart, removeFromCart, updateQuantity, setItemImage, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
