import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useSelector } from 'react-redux';
import userReducer from './modules/users/users';
import serverReducer from './modules/servers/servers';
import chatroomReducer from './modules/chatrooms/chatrooms';
import friendReducer from './modules/friends/friends';
import inviteReducer from './modules/invites/invites';
import categoryReducer from './modules/categories/categories';

export function makeStore() {
  return configureStore({
    reducer: {
      user: userReducer,
      server: serverReducer,
      chatroom: chatroomReducer,
      friend: friendReducer,
      invite: inviteReducer,
      category: categoryReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
