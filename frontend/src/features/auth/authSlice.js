import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Load user from localStorage on page refresh.
// Corrupt data must never crash the app — treat it as logged out.
const loadUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    return u && typeof u === "object" ? u : null;
  } catch {
    return null;
  }
};
const storedUser = loadUser();

// Storage can be full or blocked (private mode); the session must still work in memory.
const safeSet = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};
const safeRemove = (k) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};

// Always hand the UI a plain string — never an object/HTML body from a misbehaving server.
const errMsg = (error, fallback) => {
  const m = error?.response?.data?.message;
  return typeof m === "string" && m.trim() ? m : fallback;
};

// Reject object/array values (e.g. { $ne: null } NoSQL-injection payloads) before they reach the API.
const hasNonPrimitive = (o) =>
  o !== null && typeof o === "object" && Object.values(o).some((v) => v !== null && typeof v === "object");

// A successful auth response must carry a token, otherwise we would store a broken session.
const validSession = (d) => d && typeof d === "object" && typeof d.token === "string" && d.token !== "";

// --- Async Thunks (API calls) ---

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      if (hasNonPrimitive(userData)) return rejectWithValue("Invalid input");
      const { data } = await api.post("/auth/register", userData);
      if (!validSession(data)) return rejectWithValue("Registration failed");
      safeSet("token", data.token);
      safeSet("user", JSON.stringify(data));
      return data;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Registration failed"));
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      if (hasNonPrimitive(credentials)) return rejectWithValue("Invalid input");
      const { data } = await api.post("/auth/login", credentials);
      if (!validSession(data)) return rejectWithValue("Login failed");
      safeSet("token", data.token);
      safeSet("user", JSON.stringify(data));
      return data;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Login failed"));
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.user?.token;
      if (!token) return rejectWithValue("Please log in again");
      const { data } = await api.put("/auth/profile", profileData);
      const updated = { ...data, token };
      safeSet("user", JSON.stringify(updated));
      return updated;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Update failed"));
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      return data.message;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to send OTP"));
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      if (typeof newPassword !== "string" || newPassword === "") {
        return rejectWithValue("Password is required");
      }
      const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
      return data.message;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Password reset failed"));
    }
  }
);

// --- Slice ---

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      safeRemove("token");
      safeRemove("user"); safeRemove("cart");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
