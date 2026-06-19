import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gmailApi } from '../../api/gmailApi.js';

export const fetchGmailStatus = createAsyncThunk('gmail/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const res = await gmailApi.getStatus();
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch Gmail status');
  }
});

export const syncGmail = createAsyncThunk('gmail/sync', async (_, { rejectWithValue }) => {
  try {
    const res = await gmailApi.sync();
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Sync failed');
  }
});

export const disconnectGmail = createAsyncThunk('gmail/disconnect', async (_, { rejectWithValue }) => {
  try {
    await gmailApi.disconnect();
    return null;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Disconnect failed');
  }
});

const gmailSlice = createSlice({
  name: 'gmail',
  initialState: {
    status:     { connected: false, email: null, lastSyncAt: null, lastSyncUpdates: [] },
    fetchState: 'idle',   // idle | loading | succeeded | failed
    syncState:  'idle',   // idle | loading | succeeded | failed
    syncResult: null,     // { total, updated, updates[] }
    error:      null,
  },
  reducers: {
    resetSyncResult(state) { state.syncResult = null; state.syncState = 'idle'; },
  },
  extraReducers: (builder) => {
    builder
      // fetchGmailStatus
      .addCase(fetchGmailStatus.pending,   (s) => { s.fetchState = 'loading'; })
      .addCase(fetchGmailStatus.fulfilled, (s, a) => { s.fetchState = 'succeeded'; s.status = a.payload; })
      .addCase(fetchGmailStatus.rejected,  (s, a) => { s.fetchState = 'failed'; s.error = a.payload; })
      // syncGmail
      .addCase(syncGmail.pending,   (s) => { s.syncState = 'loading'; s.syncResult = null; })
      .addCase(syncGmail.fulfilled, (s, a) => {
        s.syncState = 'succeeded';
        s.syncResult = a.payload;
        s.status.lastSyncAt      = new Date().toISOString();
        s.status.lastSyncUpdates = a.payload.updates || [];
      })
      .addCase(syncGmail.rejected,  (s, a) => { s.syncState = 'failed'; s.error = a.payload; })
      // disconnectGmail
      .addCase(disconnectGmail.fulfilled, (s) => {
        s.status = { connected: false, email: null, lastSyncAt: null, lastSyncUpdates: [] };
        s.syncResult = null;
      });
  },
});

export const { resetSyncResult } = gmailSlice.actions;
export default gmailSlice.reducer;
