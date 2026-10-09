import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/categories`;

// Only send an Authorization header when there is a token (never "Bearer undefined").
const authHeader = (getState) => {
  const token = getState().auth?.user?.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const errMsg = (err, fallback) => {
  const m = err?.response?.data?.message;
  return typeof m === "string" && m.trim() ? m : fallback;
};

const seg = encodeURIComponent;

export const fetchCategoriesAdmin = createAsyncThunk("categories/fetchAdmin", async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.get(`${API}/admin/all`, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to load categories"));
  }
});

export const fetchCategories = createAsyncThunk("categories/fetchPublic", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(API);
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to load categories"));
  }
});

export const createCategory = createAsyncThunk("categories/create", async (payload, { getState, rejectWithValue }) => {
  try {
    if (typeof payload?.name === "string" && payload.name.trim() === "") {
      return rejectWithValue("Category name is required");
    }
    const { data } = await axios.post(API, payload, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to create category"));
  }
});

export const updateCategory = createAsyncThunk("categories/update", async ({ id, payload }, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.put(`${API}/${seg(id)}`, payload, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to update category"));
  }
});

export const deleteCategory = createAsyncThunk("categories/delete", async (id, { getState, rejectWithValue }) => {
  try {
    await axios.delete(`${API}/${seg(id)}`, authHeader(getState));
    return id;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to delete category"));
  }
});

export const addSubcategory = createAsyncThunk("categories/addSub", async ({ catId, name }, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.post(`${API}/${seg(catId)}/subcategories`, { name }, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to add subcategory"));
  }
});

export const updateSubcategory = createAsyncThunk("categories/updateSub", async ({ catId, subId, payload }, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.put(`${API}/${seg(catId)}/subcategories/${seg(subId)}`, payload, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to update subcategory"));
  }
});

export const deleteSubcategory = createAsyncThunk("categories/deleteSub", async ({ catId, subId }, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.delete(`${API}/${seg(catId)}/subcategories/${seg(subId)}`, authHeader(getState));
    return data;
  } catch (err) {
    return rejectWithValue(errMsg(err, "Failed to delete subcategory"));
  }
});

// Ignore empty/invalid payloads so a bad response can never insert null or break the list.
const upsert = (state, updated) => {
  if (!updated || typeof updated !== "object" || !updated._id) return;
  const idx = state.items.findIndex((c) => c._id === updated._id);
  if (idx >= 0) state.items[idx] = updated;
  else state.items.push(updated);
};

const categorySlice = createSlice({
  name: "categories",
  // inflight counts running requests so one finishing does not hide the spinner of another.
  initialState: { items: [], loading: false, error: null, inflight: 0 },
  reducers: {},
  extraReducers: (builder) => {
    const pending = (s) => { s.inflight = (s.inflight || 0) + 1; s.loading = true; s.error = null; };
    const settle = (s) => { s.inflight = Math.max(0, (s.inflight || 0) - 1); s.loading = s.inflight > 0; };
    const rejected = (s, a) => { settle(s); s.error = a.payload; };
    const setList = (s, a) => { settle(s); if (Array.isArray(a.payload)) s.items = a.payload; };

    builder
      .addCase(fetchCategoriesAdmin.pending,  pending)
      .addCase(fetchCategoriesAdmin.rejected, rejected)
      .addCase(fetchCategoriesAdmin.fulfilled, setList)

      .addCase(fetchCategories.pending,  pending)
      .addCase(fetchCategories.rejected, rejected)
      .addCase(fetchCategories.fulfilled, setList)

      .addCase(createCategory.pending,  pending)
      .addCase(createCategory.rejected, rejected)
      .addCase(createCategory.fulfilled, (s, a) => {
        settle(s);
        const c = a.payload;
        if (!c || typeof c !== "object" || !c._id) return;
        const idx = s.items.findIndex((x) => x._id === c._id);
        if (idx >= 0) s.items[idx] = c;
        else s.items.unshift(c);
      })

      .addCase(updateCategory.pending,  pending)
      .addCase(updateCategory.rejected, rejected)
      .addCase(updateCategory.fulfilled, (s, a) => { settle(s); upsert(s, a.payload); })

      .addCase(deleteCategory.pending,  pending)
      .addCase(deleteCategory.rejected, rejected)
      .addCase(deleteCategory.fulfilled, (s, a) => { settle(s); s.items = s.items.filter((c) => c._id !== a.payload); })

      .addCase(addSubcategory.pending,  pending)
      .addCase(addSubcategory.rejected, rejected)
      .addCase(addSubcategory.fulfilled, (s, a) => { settle(s); upsert(s, a.payload); })

      .addCase(updateSubcategory.pending,  pending)
      .addCase(updateSubcategory.rejected, rejected)
      .addCase(updateSubcategory.fulfilled, (s, a) => { settle(s); upsert(s, a.payload); })

      .addCase(deleteSubcategory.pending,  pending)
      .addCase(deleteSubcategory.rejected, rejected)
      .addCase(deleteSubcategory.fulfilled, (s, a) => { settle(s); upsert(s, a.payload); });
  },
});

export default categorySlice.reducer;
