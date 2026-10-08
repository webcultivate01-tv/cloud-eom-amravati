import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

const errMsg = (error, fallback) => {
  const m = error?.response?.data?.message;
  return typeof m === "string" && m.trim() ? m : fallback;
};

export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/employees");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to load employees"));
    }
  }
);

export const createEmployee = createAsyncThunk(
  "employees/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/employees", payload);
      return data; // { employee, emailed }
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to create employee"));
    }
  }
);

export const updateEmployee = createAsyncThunk(
  "employees/update",
  async ({ id, ...changes }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/employees/${id}`, changes);
      return data;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to update employee"));
    }
  }
);

export const toggleBlockEmployee = createAsyncThunk(
  "employees/toggleBlock",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/employees/${id}/block`);
      return data; // { message, _id, isBlocked }
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to update employee"));
    }
  }
);

export const resetEmployeePassword = createAsyncThunk(
  "employees/resetPassword",
  async ({ id, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/employees/${id}/password`, { password });
      return data; // { message, _id, mustChangePassword, emailed }
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to reset password"));
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "employees/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/employees/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(errMsg(error, "Failed to remove employee"));
    }
  }
);

const replaceOne = (state, updated) => {
  const i = state.items.findIndex((e) => e._id === updated._id);
  if (i !== -1) state.items[i] = { ...state.items[i], ...updated };
};

const employeeSlice = createSlice({
  name: "employees",
  initialState: {
    items: [],
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearEmployeeError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createEmployee.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload?.employee) state.items.unshift(action.payload.employee);
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateEmployee.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.saving = false;
        replaceOne(state, action.payload);
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(toggleBlockEmployee.fulfilled, (state, action) => {
        replaceOne(state, { _id: action.payload._id, isBlocked: action.payload.isBlocked });
      })

      .addCase(resetEmployeePassword.pending, (state) => { state.saving = true; })
      .addCase(resetEmployeePassword.fulfilled, (state, action) => {
        state.saving = false;
        replaceOne(state, { _id: action.payload._id, mustChangePassword: true });
      })
      .addCase(resetEmployeePassword.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e._id !== action.payload);
      });
  },
});

export const { clearEmployeeError } = employeeSlice.actions;
export default employeeSlice.reducer;
