import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface UserState {
  user: Record<string, unknown> | null;
  users: Record<string, unknown>[];
  isLoading: boolean;
  error: boolean;
  success: boolean;
  already: boolean;
  notVerified: boolean;
  resultEmail: boolean;
  noEmail: boolean;
  forgotPassSuccess: boolean;
  forgotPassError: boolean;
  resetPassSuccess: boolean;
  resetPassError: boolean;
}

const initialState: UserState = {
  user: null, users: [], isLoading: false, error: false, success: false,
  already: false, notVerified: false, resultEmail: false, noEmail: false,
  forgotPassSuccess: false, forgotPassError: false, resetPassSuccess: false, resetPassError: false,
};

export const userSignup = createAsyncThunk('user/signup', async (params: Record<string, string>, { rejectWithValue }) => {
  const res = await axios.post('/api/v1/users/signup', params);
  if (!res.data) return rejectWithValue('Signup failed');
  return res.data;
});

export const userLogin = createAsyncThunk('user/login', async (params: Record<string, string>, { rejectWithValue }) => {
  try {
    const res = await axios.post('/api/v1/users/login', params);
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error === 'Account not verified') {
      return rejectWithValue('not_verified');
    }
    return rejectWithValue('login_failed');
  }
});

export const userLogout = createAsyncThunk('user/logout', async (params: Record<string, unknown>) => {
  await axios.post('/api/v1/users/logout', params);
});

export const getUsers = createAsyncThunk('user/getAll', async () => {
  const res = await axios.get('/api/v1/users');
  return res.data;
});

export const getSingleUser = createAsyncThunk('user/getSingle', async (userId: number) => {
  const res = await axios.get('/api/v1/users', { params: { userId } });
  return res.data;
});

export const userUpdate = createAsyncThunk('user/update', async (params: FormData | Record<string, unknown>) => {
  const res = await axios.put('/api/v1/users/update', params);
  return res.data;
});

export const userVerification = createAsyncThunk('user/verify', async (params: Record<string, string>, { rejectWithValue }) => {
  try {
    const res = await axios.put('/api/v1/users/verify', params);
    return res.data;
  } catch {
    return rejectWithValue('verify_failed');
  }
});

export const sendEmail = createAsyncThunk('user/sendEmail', async (params: Record<string, string>) => {
  const res = await axios.post('/api/v1/users/send-email', params);
  return res.data;
});

export const forgotPassword = createAsyncThunk('user/forgotPassword', async (params: Record<string, string>) => {
  const res = await axios.post('/api/v1/users/forgot-password', params);
  return res.data;
});

export const resetPassword = createAsyncThunk('user/resetPassword', async (params: Record<string, string>) => {
  const res = await axios.post('/api/v1/users/reset-password', params);
  return res.data;
});

export const deleteUser = createAsyncThunk('user/delete', async (params: Record<string, unknown>) => {
  const res = await axios.delete('/api/v1/users', { data: params });
  return res.data;
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetValues: () => initialState,
  },
  extraReducers: builder => {
    // signup
    builder.addCase(userSignup.pending, s => { s.isLoading = true; s.error = false; s.success = false; });
    builder.addCase(userSignup.fulfilled, s => { s.isLoading = false; s.success = true; });
    builder.addCase(userSignup.rejected, s => { s.isLoading = false; s.error = true; });
    // login
    builder.addCase(userLogin.pending, s => { s.isLoading = true; s.error = false; s.notVerified = false; });
    builder.addCase(userLogin.fulfilled, (s, a) => { s.isLoading = false; s.user = a.payload; });
    builder.addCase(userLogin.rejected, (s, a) => {
      s.isLoading = false;
      if (a.payload === 'not_verified') s.notVerified = true;
      else s.error = true;
    });
    // logout
    builder.addCase(userLogout.fulfilled, s => { s.user = null; });
    // getUsers
    builder.addCase(getUsers.fulfilled, (s, a) => { s.users = a.payload; });
    // getSingle
    builder.addCase(getSingleUser.fulfilled, (s, a) => { s.user = a.payload; });
    // update
    builder.addCase(userUpdate.fulfilled, (s, a) => { s.user = a.payload; });
    // verify
    builder.addCase(userVerification.pending, s => { s.isLoading = true; s.error = false; s.success = false; s.already = false; });
    builder.addCase(userVerification.fulfilled, (s, a) => {
      s.isLoading = false;
      if (a.payload?.already) s.already = true;
      else s.success = true;
    });
    builder.addCase(userVerification.rejected, s => { s.isLoading = false; s.error = true; });
    // sendEmail
    builder.addCase(sendEmail.fulfilled, s => { s.resultEmail = true; });
    builder.addCase(sendEmail.rejected, s => { s.noEmail = true; });
    // forgotPassword
    builder.addCase(forgotPassword.pending, s => { s.forgotPassSuccess = false; s.forgotPassError = false; });
    builder.addCase(forgotPassword.fulfilled, s => { s.forgotPassSuccess = true; });
    builder.addCase(forgotPassword.rejected, s => { s.forgotPassError = true; });
    // resetPassword
    builder.addCase(resetPassword.pending, s => { s.resetPassSuccess = false; s.resetPassError = false; });
    builder.addCase(resetPassword.fulfilled, s => { s.resetPassSuccess = true; });
    builder.addCase(resetPassword.rejected, s => { s.resetPassError = true; });
  },
});

export const { resetValues } = userSlice.actions;
export default userSlice.reducer;
