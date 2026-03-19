'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { findServer, findUserList } from '@/lib/redux/modules/servers/servers';
import { friendCreate, findFriends } from '@/lib/redux/modules/friends/friends';
import { getChatrooms } from '@/lib/redux/modules/chatrooms/chatrooms';
import { categoryFindAll } from '@/lib/redux/modules/categories/categories';
import { userLogout } from '@/lib/redux/modules/users/users';
import { getSocket } from '@/lib/socket';
import { JWTPayload } from '@/lib/auth';
import type { Server, Chatroom as ChatroomType, Friend, ServerUser } from '@/lib/types';
import Chatroom from '@/components/Chatroom/Chatroom';
import VoiceRoom from '@/components/VoiceRoom/VoiceRoom';
import ChatroomFriend from '@/components/ChatroomFriend/ChatroomFriend';
import CreateServer from '@/components/CreateServer/CreateServer';
import JoinServer from '@/components/JoinServer/JoinServer';
import ServerChannelList from '@/components/ServerChannelList/ServerChannelList';
import ServerSettings from '@/components/ServerSettings/ServerSettings';
import UserSettings from '@/components/UserSettings/UserSettings';

interface Props {
  initialUser: JWTPayload;
  initialServers: Server[];
  initialActiveServer: Server | null;
  initialPendingChatroomId: number | null;
}

const COOKIE = 'dashboard_selection';
function saveSelection(value: object) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=604800; SameSite=Lax`;
}
function clearSelection() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}
function readSelection() {
  const match = document.cookie.split('; ').find(r => r.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1))); } catch { return null; }
}

export default function DashboardClient({ initialUser, initialServers, initialActiveServer, initialPendingChatroomId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { servers: reduxServers, serverUserList } = useAppSelector(s => s.server);
  const servers = reduxServers.length > 0 ? reduxServers : initialServers;
  const { friends } = useAppSelector(s => s.friend);
  const { chatrooms } = useAppSelector(s => s.chatroom);

  const hasRestored = useRef(initialActiveServer !== null);
  const pendingChatroomId = useRef<number | null>(initialPendingChatroomId);

  const [activeServer, setActiveServer] = useState<Server | null>(initialActiveServer);
  const [activeChatroom, setActiveChatroom] = useState('');
  const [activeChatroomId, setActiveChatroomId] = useState<number | null>(null);
  const [activeChatroomType, setActiveChatroomType] = useState<'text' | 'voice'>('text');
  const [currentFriend, setCurrentFriend] = useState<Friend | null>(null);
  const [serverId, setServerId] = useState<number | null>(initialActiveServer?.serverId ?? null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser);

  const { id, email } = initialUser;
  const username = currentUser.username;
  const socket = getSocket();

  useEffect(() => {
    dispatch(findServer(id));
    dispatch(findFriends(id));
    socket.emit('SEND_USER', { userId: id, username, active: true });
  }, [dispatch, id, username, socket]);

  useEffect(() => {
    if (serverId) {
      dispatch(getChatrooms(serverId));
      dispatch(findUserList(serverId));
      dispatch(categoryFindAll(serverId));
    }
  }, [serverId, dispatch]);

  useEffect(() => {
    const me = serverUserList.find(u => u.username === username);
    setIsAdmin(me?.type === 'admin' || me?.type === 'owner');
  }, [serverUserList, username]);

  // Restore selection from cookie once servers/friends have loaded (friend DM case, or fallback)
  useEffect(() => {
    if (hasRestored.current) return;
    const sel = readSelection();
    if (!sel) { hasRestored.current = true; return; }
    if ((sel.type === 'server' || sel.type === 'chatroom') && servers.length > 0) {
      const server = servers.find((s: Server) => s.serverId === sel.serverId);
      if (server) {
        setActiveServer(server);
        setServerId(server.serverId);
        if (sel.type === 'chatroom') pendingChatroomId.current = sel.chatroomId;
      }
      hasRestored.current = true;
    } else if (sel.type === 'friend' && friends.length > 0) {
      const friend = friends.find((f: Friend) => f.id === sel.friendId);
      if (friend) setCurrentFriend(friend);
      hasRestored.current = true;
    }
  }, [servers, friends]);

  // Restore chatroom once chatrooms have loaded for the restored server
  useEffect(() => {
    if (!pendingChatroomId.current || chatrooms.length === 0) return;
    const chatroom = chatrooms.find(c => c.id === pendingChatroomId.current);
    if (chatroom) {
      setActiveChatroom(chatroom.name);
      setActiveChatroomId(chatroom.id);
      setActiveChatroomType(chatroom.type);
      pendingChatroomId.current = null;
    }
  }, [chatrooms]);

  const handleLogout = async () => {
    socket.emit('LOGOUT_USER', { username });
    clearSelection();
    await dispatch(userLogout({ id }));
    router.push('/login');
  };

  const goHome = () => {
    setActiveServer(null);
    setServerId(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    clearSelection();
  };

  const selectServer = (server: Server) => {
    setActiveServer(server);
    setServerId(server.serverId);
    setCurrentFriend(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    saveSelection({ type: 'server', serverId: server.serverId });
  };

  const selectChatroom = (chatroom: ChatroomType) => {
    setActiveChatroom(chatroom.name);
    setActiveChatroomId(chatroom.id);
    setActiveChatroomType(chatroom.type);
    setCurrentFriend(null);
    saveSelection({ type: 'chatroom', serverId: activeServer?.serverId, chatroomId: chatroom.id });
  };

  const selectFriend = (friend: Friend) => {
    setCurrentFriend(friend);
    setActiveServer(null);
    setServerId(null);
    setActiveChatroom('');
    setActiveChatroomId(null);
    saveSelection({ type: 'friend', friendId: friend.id });
  };

  const handleStartDM = async (user: ServerUser) => {
    const result = await dispatch(friendCreate({
      userId: id,
      friendId: user.userId,
      username: user.username,
      friendUsername: user.username,
      imageUrl: user.imageUrl ?? null,
    }));
    if (friendCreate.fulfilled.match(result)) {
      const updatedFriends = result.payload as Friend[];
      const found = updatedFriends.find(f => f.friendId === user.userId);
      if (found) {
        setCurrentFriend(found);
        setActiveServer(null);
        setServerId(null);
        setActiveChatroom('');
        setActiveChatroomId(null);
      }
    }
  };

  const isHome = !activeServer;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-800 text-white">

      {/* Far-left server icon rail */}
      <div className="flex w-[72px] flex-shrink-0 flex-col items-center gap-2 bg-gray-900 py-3">

        {/* Home / DM icon */}
        <div className="group relative h-12">
          <span className={`absolute -left-3 top-1/2 w-1 -translate-y-1/2 rounded-r transition-all duration-200 ${isHome ? 'h-10 bg-green-500' : 'h-0 bg-white group-hover:h-6'}`} />
          <button
            onClick={goHome}
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-indigo-600 transition-all hover:rounded-2xl hover:bg-indigo-500 ${isHome ? 'rounded-2xl ring-2 ring-green-500' : ''}`}
          >
            <Image src="/logo.png" alt="Home" width={30} height={17} />
          </button>
          <span className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs opacity-0 group-hover:opacity-100">
            Home
          </span>
        </div>

        <div className="my-1 w-8 border-t border-gray-700" />

        {/* Server icons */}
        {servers.filter(s => s.active !== false).map((s, i) => {
          const isActive = activeServer?.serverId === s.serverId;
          return (
            <div key={i} className="group relative h-12">
              <span className={`absolute -left-3 top-1/2 w-1 -translate-y-1/2 rounded-r transition-all duration-200 ${isActive ? 'h-10 bg-green-500' : 'h-0 bg-white group-hover:h-6'}`} />
              <button
                onClick={() => selectServer(s)}
                title={s.name}
                className={`flex h-12 w-12 items-center justify-center overflow-hidden text-sm font-bold transition-all hover:rounded-2xl ${isActive ? 'rounded-2xl' : 'rounded-full'} ${s.imageUrl ? '' : 'bg-gray-600 hover:bg-indigo-500'}`}
              >
                {s.imageUrl
                  ? <Image src={s.imageUrl} alt={s.name} width={48} height={48} className="h-full w-full object-cover" />
                  : s.name?.[0]?.toUpperCase()
                }
              </button>
              <span className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs opacity-0 group-hover:opacity-100">
                {s.name}
              </span>
            </div>
          );
        })}

        {/* Create a Server */}
        <div className="group relative">
          <button
            onClick={() => setModal('create')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-green-400 transition-all hover:rounded-2xl hover:bg-green-500 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs opacity-0 group-hover:opacity-100">
            Create a Server
          </span>
        </div>

      </div>

      {/* Channel / DM sidebar */}
      <div className="flex w-48 flex-shrink-0 flex-col bg-gray-700">
        {activeServer ? (
          <ServerChannelList
            serverId={activeServer.serverId}
            serverName={activeServer.name}
            isAdmin={isAdmin}
            activeChatroomId={activeChatroomId}
            onSelectChatroom={selectChatroom}
            onOpenSettings={() => setShowServerSettings(true)}
          />
        ) : (
          <>
            <div className="border-b border-gray-600 px-4 py-3">
              <p className="text-sm font-bold">Direct Messages</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {friends.map((f, i) => (
                <button
                  key={i}
                  onClick={() => selectFriend(f)}
                  className={`w-full px-4 py-1 text-left text-sm hover:bg-gray-600 ${currentFriend?.id === f.id ? 'bg-gray-600 text-white' : 'text-gray-300'}`}
                >
                  @ {f.username}
                </button>
              ))}
            </div>
            {/* User info bar */}
            <div className="flex items-center gap-2 border-t border-gray-600 bg-gray-800 px-3 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold overflow-hidden">
                {currentUser.imageUrl
                  ? <img src={currentUser.imageUrl} alt={username} className="h-full w-full object-cover" />
                  : username[0]?.toUpperCase()
                }
              </div>
              <span className="flex-1 truncate text-xs font-semibold">{username}</span>
              <button onClick={() => setShowUserSettings(true)} title="Settings" className="text-gray-400 hover:text-white text-xs">⚙</button>
              <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-400 text-xs">⏻</button>
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeChatroomId && serverId && !currentFriend && activeChatroomType === 'text' && (
          <Chatroom
            userId={id}
            username={username}
            activeChatroom={activeChatroom}
            activeChatroomId={activeChatroomId}
            activeChatroomType={activeChatroomType}
            serverId={serverId}
            isAdmin={isAdmin}
            serverUserList={serverUserList}
            onStartDM={handleStartDM}
          />
        )}
        {activeChatroomId && serverId && !currentFriend && activeChatroomType === 'voice' && (
          <VoiceRoom
            username={username}
            activeChatroom={activeChatroom}
            activeChatroomId={activeChatroomId}
            serverId={serverId}
          />
        )}
        {currentFriend && (
          <ChatroomFriend
            userId={id}
            username={username}
            friendId={currentFriend.friendId}
            groupId={currentFriend.groupId}
          />
        )}
        {/* Home screen: show create/join cards */}
        {isHome && !currentFriend && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex gap-6">
              <div className="flex w-56 flex-col items-center rounded-lg bg-gray-700 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-white">Create</h2>
                <p className="mb-4 text-sm text-gray-400">Create a new server and invite other people to join!</p>
                <button
                  onClick={() => setModal('create')}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create a server
                </button>
              </div>
              <div className="flex w-56 flex-col items-center rounded-lg bg-gray-700 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-white">Join</h2>
                <p className="mb-4 text-sm text-gray-400">Enter a secret invite code to join an existing server!</p>
                <button
                  onClick={() => setModal('join')}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Join a server
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Server selected but no chatroom chosen */}
        {activeServer && !activeChatroomId && !currentFriend && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a channel to start chatting
          </div>
        )}
      </div>

      {modal === 'create' && (
        <CreateServer
          userId={id}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); dispatch(findServer(id)); }}
        />
      )}
      {modal === 'join' && (
        <JoinServer
          userId={id}
          email={email}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); dispatch(findServer(id)); }}
        />
      )}

      {showServerSettings && activeServer && (
        <ServerSettings
          serverId={activeServer.serverId}
          serverName={activeServer.name}
          currentUsername={username}
          userId={id}
          onClose={() => setShowServerSettings(false)}
          onServerDeleted={() => { setShowServerSettings(false); setActiveServer(null); setServerId(null); dispatch(findServer(id)); }}
          onServerUpdated={() => dispatch(findServer(id))}
        />
      )}

      {showUserSettings && (
        <UserSettings
          user={currentUser}
          onClose={() => setShowUserSettings(false)}
          onSaved={(updated) => setCurrentUser(u => ({ ...u, ...updated }))}
        />
      )}
    </div>
  );
}
