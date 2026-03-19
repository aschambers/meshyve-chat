import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Server, ServerUser } from '@/lib/types';

export interface ServerInfo {
  id: number;
  name: string;
  userId: number;
  public: boolean;
  region: string;
  active: boolean;
  imageUrl: string | null;
}

interface ServerState {
  servers: Server[];
  serverUserList: ServerUser[];
  serverUserBans: ServerUser[];
  serverInfo: ServerInfo | null;
  isLoading: boolean;
  error: boolean;
  findBansSuccess: boolean;
  unbanUserSuccess: boolean;
}

const initialState: ServerState = {
  servers: [], serverUserList: [], serverUserBans: [], serverInfo: null,
  isLoading: false, error: false, findBansSuccess: false, unbanUserSuccess: false,
};

export const createServer = createAsyncThunk('server/create', async (params: FormData) => {
  const res = await axios.post('/api/v1/servers', params);
  return res.data;
});

export const findServer = createAsyncThunk('server/find', async (userId: number) => {
  const res = await axios.get('/api/v1/servers', { params: { id: userId } });
  return res.data;
});

export const findUserList = createAsyncThunk('server/findUserList', async (serverId: number) => {
  const res = await axios.get('/api/v1/servers/user-list', { params: { serverId } });
  return res.data;
});

export const findUserBans = createAsyncThunk('server/findUserBans', async (serverId: number) => {
  const res = await axios.get('/api/v1/servers/user-bans', { params: { serverId } });
  return res.data;
});

export const unbanUser = createAsyncThunk('server/unbanUser', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/servers/unban', params);
  return res.data;
});

export const deleteServer = createAsyncThunk('server/delete', async (params: Record<string, unknown>) => {
  const res = await axios.delete('/api/v1/servers', { data: params });
  return res.data;
});

export const updateUserRole = createAsyncThunk('server/updateUserRole', async (params: Record<string, unknown>) => {
  const res = await axios.put('/api/v1/servers/user-list', params);
  return res.data;
});

export const kickServerUser = createAsyncThunk('server/kickUser', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/servers/kick', params);
  return res.data;
});

export const banServerUser = createAsyncThunk('server/banUser', async (params: Record<string, unknown>) => {
  const res = await axios.post('/api/v1/servers/ban', params);
  return res.data;
});

export const serverToggle = createAsyncThunk('server/toggle', async (params: Record<string, unknown>) => {
  const res = await axios.put('/api/v1/servers/toggle', params);
  return res.data;
});

export const fetchServerInfo = createAsyncThunk('server/fetchInfo', async (serverId: number) => {
  const res = await axios.get('/api/v1/servers/info', { params: { serverId } });
  return res.data;
});

export const updateServer = createAsyncThunk('server/update', async (params: FormData) => {
  const res = await axios.put('/api/v1/servers/update', params);
  return res.data;
});

const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    resetServerValues: (state) => ({
      ...state,
      isLoading: false,
      error: false,
      findBansSuccess: false,
      unbanUserSuccess: false,
    }),
  },
  extraReducers: builder => {
    builder.addCase(createServer.pending, s => { s.isLoading = true; s.error = false; });
    builder.addCase(createServer.fulfilled, (s, a) => { s.isLoading = false; s.servers = a.payload; });
    builder.addCase(createServer.rejected, s => { s.isLoading = false; s.error = true; });

    builder.addCase(findServer.fulfilled, (s, a) => { s.servers = a.payload; });
    builder.addCase(findUserList.fulfilled, (s, a) => { s.serverUserList = a.payload; });
    builder.addCase(findUserBans.fulfilled, (s, a) => { s.serverUserBans = a.payload; s.findBansSuccess = true; });
    builder.addCase(unbanUser.fulfilled, (s, a) => { s.serverUserBans = a.payload; s.unbanUserSuccess = true; });
    builder.addCase(deleteServer.fulfilled, s => { s.servers = []; });
    builder.addCase(updateUserRole.fulfilled, (s, a) => { s.serverUserList = a.payload; });
    builder.addCase(kickServerUser.fulfilled, (s, a) => { s.serverUserList = a.payload; });
    builder.addCase(banServerUser.fulfilled, (s, a) => { s.serverUserList = a.payload; });
    builder.addCase(serverToggle.fulfilled, (s, a) => { s.servers = a.payload; });
    builder.addCase(fetchServerInfo.fulfilled, (s, a) => { s.serverInfo = a.payload; });
    builder.addCase(updateServer.fulfilled, (s, a) => { s.serverInfo = a.payload; });
  },
});

export const { resetServerValues } = serverSlice.actions;
export default serverSlice.reducer;
