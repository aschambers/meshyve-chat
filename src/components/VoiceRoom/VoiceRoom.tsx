'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getSocket } from '@/lib/socket';

interface Props {
  username: string;
  activeChatroom: string;
  activeChatroomId: number;
  serverId: number;
  autoJoin?: boolean;
  onAutoJoined?: () => void;
  onInVoiceChange?: (v: boolean) => void;
  onMutedChange?: (v: boolean) => void;
  deafened?: boolean;
  onDeafenToggle?: () => void;
  onDeafenedUsersChange?: (users: Record<string, boolean>) => void;
  userImages?: Record<string, string | null>;
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

export interface VoiceRoomHandle {
  leave: () => void;
  toggleMute: () => void;
}

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function roomKey(serverId: number, chatroomId: number) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
  return `${base}/chatroom/${serverId}/${chatroomId}`;
}

const VoiceRoom = forwardRef<VoiceRoomHandle, Props>(function VoiceRoom(
  { username, activeChatroom, activeChatroomId, serverId, autoJoin, onAutoJoined, onInVoiceChange, onMutedChange, deafened, onDeafenToggle, onDeafenedUsersChange, userImages, onChatToggle, chatOpen },
  ref
) {
  const socket = getSocket();
  const room = roomKey(serverId, activeChatroomId);

  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<string[]>([]);
  const [deafenedUsers, setDeafenedUsers] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const onDeafenedUsersChangeRef = useRef(onDeafenedUsersChange);
  onDeafenedUsersChangeRef.current = onDeafenedUsersChange;
  useEffect(() => {
    onDeafenedUsersChangeRef.current?.(deafenedUsers);
  }, [deafenedUsers]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const inVoiceRef = useRef(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const onInVoiceChangeRef = useRef(onInVoiceChange);
  const onMutedChangeRef = useRef(onMutedChange);
  onInVoiceChangeRef.current = onInVoiceChange;
  onMutedChangeRef.current = onMutedChange;

  // Deafen: mute all remote audio elements and toggle own mic accordingly
  useEffect(() => {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="voice-audio-"]').forEach(el => {
      el.muted = !!deafened;
    });
    if (localStreamRef.current) {
      if (deafened) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      } else {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !mutedRef.current; });
      }
    }
    // Broadcast deafen state to others in the channel
    if (inVoiceRef.current) {
      socket.emit('VOICE_DEAFEN', { username, chatroomId: activeChatroomId, deafened: !!deafened });
    }
  }, [deafened, socket, username, activeChatroomId]);

  const removePeer = useCallback((targetUsername: string) => {
    const pc = peersRef.current.get(targetUsername);
    if (pc) { pc.close(); peersRef.current.delete(targetUsername); }
    pendingCandidatesRef.current.delete(targetUsername);
    document.getElementById(`voice-audio-${targetUsername}`)?.remove();
  }, []);

  const createPeer = useCallback((targetUsername: string, stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(STUN);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('VOICE_ICE', { to: targetUsername, from: username, candidate: e.candidate, chatroomId: activeChatroomId });
      }
    };

    pc.ontrack = e => {
      const audioId = `voice-audio-${targetUsername}`;
      let audio = document.getElementById(audioId) as HTMLAudioElement | null;
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = audioId;
        document.body.appendChild(audio);
      }
      audio.srcObject = e.streams[0];
      audio.play().catch(console.error);
    };

    peersRef.current.set(targetUsername, pc);
    return pc;
  }, [socket, username, activeChatroomId]);

  // Socket event handlers
  useEffect(() => {
    const handleVoiceUsers = async (users: string[]) => {
      setVoiceUsers(prev => [...new Set([...prev, ...users])]);
      const stream = localStreamRef.current;
      if (!stream) return;
      for (const user of users) {
        const pc = createPeer(user, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('VOICE_OFFER', { to: user, from: username, desc: offer, chatroomId: activeChatroomId });
      }
    };

    const handleVoiceUserJoined = ({ username: joined }: { username: string }) => {
      setVoiceUsers(prev => [...new Set([...prev, joined])]);
    };

    const handleVoiceUserLeft = ({ username: left }: { username: string }) => {
      setVoiceUsers(prev => prev.filter(u => u !== left));
      setDeafenedUsers(prev => { const next = { ...prev }; delete next[left]; return next; });
      removePeer(left);
    };

    const handleVoiceDeafen = ({ username: who, deafened: isDeafened }: { username: string; deafened: boolean }) => {
      setDeafenedUsers(prev => ({ ...prev, [who]: isDeafened }));
    };

    const flushCandidates = async (pc: RTCPeerConnection, from: string) => {
      const queued = pendingCandidatesRef.current.get(from) ?? [];
      for (const c of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
      }
      pendingCandidatesRef.current.delete(from);
    };

    const handleVoiceOffer = async ({ from, desc }: { from: string; desc: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const pc = createPeer(from, stream);
      await pc.setRemoteDescription(desc);
      await flushCandidates(pc, from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('VOICE_ANSWER', { to: from, from: username, desc: answer, chatroomId: activeChatroomId });
    };

    const handleVoiceAnswer = async ({ from, desc }: { from: string; desc: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(desc).catch(console.error);
      await flushCandidates(pc, from);
    };

    const handleVoiceIce = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      } else {
        const queued = pendingCandidatesRef.current.get(from) ?? [];
        queued.push(candidate);
        pendingCandidatesRef.current.set(from, queued);
      }
    };

    socket.on('VOICE_USERS', handleVoiceUsers);
    socket.on('VOICE_USER_JOINED', handleVoiceUserJoined);
    socket.on('VOICE_USER_LEFT', handleVoiceUserLeft);
    socket.on('VOICE_OFFER', handleVoiceOffer);
    socket.on('VOICE_ANSWER', handleVoiceAnswer);
    socket.on('VOICE_ICE', handleVoiceIce);
    socket.on('VOICE_DEAFEN', handleVoiceDeafen);

    return () => {
      socket.off('VOICE_USERS', handleVoiceUsers);
      socket.off('VOICE_USER_JOINED', handleVoiceUserJoined);
      socket.off('VOICE_USER_LEFT', handleVoiceUserLeft);
      socket.off('VOICE_OFFER', handleVoiceOffer);
      socket.off('VOICE_ANSWER', handleVoiceAnswer);
      socket.off('VOICE_ICE', handleVoiceIce);
      socket.off('VOICE_DEAFEN', handleVoiceDeafen);
    };
  }, [socket, username, activeChatroomId, createPeer, removePeer]);

  // Auto-join when launched directly from the channel list (works whether VoiceRoom just mounted or was already open)
  useEffect(() => {
    if (autoJoin && !inVoiceRef.current) {
      joinVoice().finally(() => onAutoJoined?.());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin]);

  // Clean up when switching away from this voice channel
  useEffect(() => {
    return () => {
      if (inVoiceRef.current) {
        socket.emit('LEAVE_VOICE', { username, chatroomId: activeChatroomId, room });
        peersRef.current.forEach((_, name) => removePeer(name));
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        onInVoiceChangeRef.current?.(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatroomId, socket, username, room, removePeer]);

  const joinVoice = async () => {
    if (inVoiceRef.current) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Apply pre-join mute/deafen state immediately
      stream.getAudioTracks().forEach(t => { t.enabled = !muted && !deafened; });
      localStreamRef.current = stream;
      setInVoice(true);
      inVoiceRef.current = true;
      setVoiceUsers(prev => [...new Set([...prev, username])]);
      socket.emit('JOIN_VOICE', { username, chatroomId: activeChatroomId, room });
      onInVoiceChangeRef.current?.(true);
    } catch {
      setError('Microphone access denied. Please allow microphone access to join voice.');
    }
  };

  const leaveVoice = () => {
    socket.emit('LEAVE_VOICE', { username, chatroomId: activeChatroomId, room });
    peersRef.current.forEach((_, name) => removePeer(name));
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setInVoice(false);
    inVoiceRef.current = false;
    setVoiceUsers(prev => prev.filter(u => u !== username));
    onInVoiceChangeRef.current?.(false);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const nowMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setMuted(nowMuted);
    onMutedChangeRef.current?.(nowMuted);
  };

  useImperativeHandle(ref, () => ({
    leave: leaveVoice,
    toggleMute,
  }));

  const count = voiceUsers.length;
  const gridCols = count === 1 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  const avatarSize = count === 1 ? 'w-24 h-24 text-3xl' : count <= 4 ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base';

  return (
    <div className="flex flex-1 flex-col bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-600 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{activeChatroom}</span>
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[0.625rem] text-gray-400">Voice</span>
        </div>
        {onChatToggle && (
          <button
            onClick={onChatToggle}
            title={chatOpen ? 'Hide chat' : 'Show chat'}
            className={`rounded p-1.5 transition-colors ${chatOpen ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      {count === 0 ? (
        <p className="text-sm text-gray-500">No one is here yet</p>
      ) : (
        <div className={`grid ${gridCols} place-items-center gap-8`}>
          {voiceUsers.map(user => {
            const isSelf = user === username;
            const isDeafened = isSelf ? !!deafened : !!deafenedUsers[user];
            const silenced = isSelf && (muted || deafened);
            const showBadge = silenced || isDeafened;
            return (
              <div key={user} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className={`flex items-center justify-center rounded-full font-bold text-white select-none ring-2 overflow-hidden ${avatarSize} ${showBadge ? 'ring-red-500 bg-gray-700' : 'ring-gray-600 bg-gray-700'}`}>
                    {userImages?.[user]
                      ? <img src={userImages[user]!} alt={user} className="h-full w-full object-cover" loading="eager" />
                      : user[0]?.toUpperCase()
                    }
                  </div>
                  {showBadge && (
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-2 ring-gray-800">
                      {isDeafened ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                          <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <span className="max-w-[5rem] truncate text-center text-xs text-gray-300">{user}</span>
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p className="rounded bg-red-900/40 px-3 py-2 text-xs text-red-400">{error}</p>
      )}
    </div>
    </div>
  );
});

export default VoiceRoom;
