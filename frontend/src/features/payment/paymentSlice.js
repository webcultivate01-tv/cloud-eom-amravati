import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Create a Razorpay order on the backend (returns razorpay_order_id).
// Pass { amount, items, shippingAddress, couponCode } — the server prices the
// order itself (delivery rate, coupon) and the amount it returns is what is charged.
export const createRazorpayOrder = createAsyncThunk(
  "payment/createOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/payment/create-order", payload);
      return data; // { razorpayOrderId, amount, currency, keyId }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create payment order");
    }
  }
);

// Verify payment and create DB order
export const verifyAndPlaceOrder = createAsyncThunk(
  "payment/verifyAndPlace",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/payment/verify", payload);
      return data; // the created Order document
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Payment verification failed");
    }
  }
);

// Admin: get payment stats
export const fetchPaymentStats = createAsyncThunk(
  "payment/stats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/payment/stats");
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch payment stats");
    }
  }
);

// Admin: list all payments
export const fetchAllPayments = createAsyncThunk(
  "payment/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const { data } = await api.get(`/payment/all${query ? `?${query}` : ""}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch payments");
    }
  }
);

// Admin: mark order refunded
export const markOrderRefunded = createAsyncThunk(
  "payment/refund",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/payment/${orderId}/refund`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Refund failed");
    }
  }
);

const paymentSlice = createSlice({
  name: "payment",
  initialState: {
    razorpayOrder: null,
    createdOrder: null,
    stats: null,
    payments: [],
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    resetPayment: (state) => {
      state.razorpayOrder = null;
      state.createdOrder = null;
      state.error = null;
      state.success = false;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRazorpayOrder.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(createRazorpayOrder.fulfilled, (s, a) => { s.loading = false; s.razorpayOrder = a.payload; })
      .addCase(createRazorpayOrder.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(verifyAndPlaceOrder.pending,   (s) => { s.loading = true; s.error = null; s.success = false; })
      .addCase(verifyAndPlaceOrder.fulfilled, (s, a) => { s.loading = false; s.success = true; s.createdOrder = a.payload; })
      .addCase(verifyAndPlaceOrder.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchPaymentStats.pending,   (s) => { s.loading = true; })
      .addCase(fetchPaymentStats.fulfilled, (s, a) => { s.loading = false; s.stats = a.payload; })
      .addCase(fetchPaymentStats.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchAllPayments.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchAllPayments.fulfilled, (s, a) => { s.loading = false; s.payments = a.payload; })
      .addCase(fetchAllPayments.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(markOrderRefunded.fulfilled, (s) => { s.loading = false; });
  },
});

export const { resetPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
