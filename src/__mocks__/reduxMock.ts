import { configureStore } from '@reduxjs/toolkit';

export const mockStore = configureStore({
  reducer: {
    server: () => ({
      servers: [],
      isLoading: false,
      error: false,
      serverUserList: [],
      serverUserBans: [],
      serverInfo: null,
    }),
    invite: () => ({ isLoading: false, error: false, errorMessage: '', invites: [] }),
    user: () => ({ isLoading: false }),
    friend: () => ({ friends: [], requests: [] }),
    chatroom: () => ({ chatrooms: [] }),
    category: () => ({ categories: [], isLoading: false }),
    friendRequest: () => ({ requests: [] }),
  },
});
