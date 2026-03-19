'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface Props {
  username: string;
  activeChatroom: string;
  activeChatroomId: number;
  serverId: number;
}

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function roomKey(serverId: number, chatroomId: number) {
  const base = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
  return `${base}/chatroom/${serverId}/${chatroomId}`;
}

export default function VoiceRoom({ username, activeChatroom, activeChatroomId, serverId }: Props) {
  const socket = getSocket();
  const room = roomKey(serverId, activeChatroomId);

  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const inVoiceRef = useRef(false);

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
      removePeer(left);
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

    return () => {
      socket.off('VOICE_USERS', handleVoiceUsers);
      socket.off('VOICE_USER_JOINED', handleVoiceUserJoined);
      socket.off('VOICE_USER_LEFT', handleVoiceUserLeft);
      socket.off('VOICE_OFFER', handleVoiceOffer);
      socket.off('VOICE_ANSWER', handleVoiceAnswer);
      socket.off('VOICE_ICE', handleVoiceIce);
    };
  }, [socket, username, activeChatroomId, createPeer, removePeer]);

  // Clean up when switching away from this voice channel
  useEffect(() => {
    return () => {
      if (inVoiceRef.current) {
        socket.emit('LEAVE_VOICE', { username, chatroomId: activeChatroomId, room });
        peersRef.current.forEach((_, name) => removePeer(name));
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [activeChatroomId, socket, username, room, removePeer]);

  const joinVoice = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInVoice(true);
      inVoiceRef.current = true;
      setVoiceUsers(prev => [...new Set([...prev, username])]);
      socket.emit('JOIN_VOICE', { username, chatroomId: activeChatroomId, room });
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
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const nowMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setMuted(nowMuted);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-800">
      <div className="w-full max-w-sm rounded-xl bg-gray-700 p-6 shadow-xl">

        {/* Header */}
        <div className="mb-5 flex items-center gap-2 border-b border-gray-600 pb-4">
          <span className="text-xl">🔊</span>
          <h2 className="font-bold text-white">{activeChatroom}</h2>
          <span className="ml-auto rounded bg-gray-600 px-2 py-0.5 text-xs text-gray-400">Voice Channel</span>
        </div>

        {/* Connected users */}
        <div className="mb-5 min-h-[80px] space-y-2">
          {voiceUsers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No one is here yet — join to start talking!
            </p>
          ) : (
            voiceUsers.map(user => (
              <div key={user} className="flex items-center gap-3 rounded-lg bg-gray-600 px-3 py-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold">
                  {user[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-sm">{user}</span>
                {user === username && inVoice && (
                  <span className={`text-sm ${muted ? 'text-red-400' : 'text-green-400'}`}>
                    {muted ? '🔇' : '🎤'}
                  </span>
                )}
                {user !== username && (
                  <span className="text-sm text-green-400">🎤</span>
                )}
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-900/40 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!inVoice ? (
            <button
              onClick={joinVoice}
              className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              Join Voice
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${muted ? 'bg-gray-500 hover:bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {muted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              <button
                onClick={leaveVoice}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Leave
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
