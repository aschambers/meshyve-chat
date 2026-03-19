import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import type { Category } from '@/lib/types';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
}

const initialState: CategoryState = { categories: [], isLoading: false, error: false, success: false };

export const categoryCreate = createAsyncThunk('category/create', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/categories', params);
  return res.data;
});

export const categoryFindAll = createAsyncThunk('category/findAll', async (serverId: number) => {
  const res = await axios.get('/api/v1/categories', { params: { serverId } });
  return res.data;
});

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: { resetCategoryValues: () => initialState },
  extraReducers: builder => {
    builder.addCase(categoryCreate.fulfilled, (s, a) => { s.categories = a.payload; s.success = true; });
    builder.addCase(categoryFindAll.fulfilled, (s, a) => { s.categories = a.payload; });
  },
});

export const { resetCategoryValues } = categorySlice.actions;
export default categorySlice.reducer;
