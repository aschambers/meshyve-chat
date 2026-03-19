import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Invite } from '@/lib/types';

interface InviteState {
  invites: Invite[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
}

const initialState: InviteState = { invites: [], isLoading: false, error: false, success: false };

export const inviteCreate = createAsyncThunk('invite/create', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/invites', params);
  return res.data;
});

export const inviteEmailCreate = createAsyncThunk('invite/emailCreate', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/invites/email', params);
  return res.data;
});

export const inviteVerification = createAsyncThunk('invite/verify', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/invites/verify', params);
  return res.data;
});

export const findInvites = createAsyncThunk('invite/findAll', async (serverId: number) => {
  const res = await axios.get('/api/v1/invites', { params: { serverId } });
  return res.data;
});

export const deleteInvite = createAsyncThunk('invite/delete', async (params: { inviteId: number; serverId: number }) => {
  const res = await axios.delete('/api/v1/invites', { data: params });
  return res.data;
});

const inviteSlice = createSlice({
  name: 'invite',
  initialState,
  reducers: { resetInviteValues: () => initialState },
  extraReducers: builder => {
    builder.addCase(inviteCreate.fulfilled, (s, a) => { s.success = true; });
    builder.addCase(inviteEmailCreate.fulfilled, s => { s.success = true; });
    builder.addCase(inviteVerification.fulfilled, (s, a) => { s.success = true; });
    builder.addCase(findInvites.fulfilled, (s, a) => { s.invites = a.payload; });
    builder.addCase(deleteInvite.fulfilled, (s, a) => { s.invites = a.payload; });
  },
});

export const { resetInviteValues } = inviteSlice.actions;
export default inviteSlice.reducer;
