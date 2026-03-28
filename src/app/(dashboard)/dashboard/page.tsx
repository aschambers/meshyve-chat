import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import User from '@/lib/models/User';
import DashboardClient from '@/components/Dashboard/DashboardClient';
import type { Server } from '@/lib/types';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const user = await User.findByPk(session.id);
  const initialServers = (user?.serversList ?? []) as Server[];

  let initialActiveServer: Server | null = null;
  let initialPendingChatroomId: number | null = null;
  let initialSidebarOpen = true;
  let initialSidebarWidth = 256;
  let initialUserStatus: 'online' | 'away' | 'busy' | 'offline' = 'online';
  let initialStatusExpiresAt: number | null = null;
  try {
    const cookieStore = await cookies();
    const sw = cookieStore.get('sidebarWidth')?.value;
    if (sw) initialSidebarWidth = Math.min(400, Math.max(250, parseInt(sw, 10)));
    const raw = cookieStore.get('dashboard_selection')?.value;
    if (raw) {
      const sel = JSON.parse(decodeURIComponent(raw));
      if (sel?.serverId) {
        initialActiveServer =
          initialServers.find((s: Server) => s.serverId === sel.serverId) ?? null;
      }
      if (initialActiveServer && sel.type === 'chatroom' && sel.chatroomId) {
        initialPendingChatroomId = sel.chatroomId;
        if (sel.chatOpen) initialSidebarOpen = false;
      } else if (sel.type === 'friend' && sel.chatOpen) {
        initialSidebarOpen = false;
      } else if (sel.type === 'server') {
        initialSidebarOpen = true;
      }
    }
    const statusRaw = cookieStore.get('meshyve_user_status')?.value;
    if (statusRaw) {
      const { status, expiresAt } = JSON.parse(decodeURIComponent(statusRaw));
      if (!expiresAt || Date.now() < expiresAt) {
        initialUserStatus = status ?? 'online';
        initialStatusExpiresAt = expiresAt ?? null;
      }
    }
  } catch {}

  return (
    <DashboardClient
      initialUser={{
        ...session,
        imageUrl: user?.imageUrl ?? null,
        nameColor: user?.nameColor ?? session.nameColor ?? null,
        description: user?.description ?? null,
      }}
      initialServers={initialServers}
      initialActiveServer={initialActiveServer}
      initialPendingChatroomId={initialPendingChatroomId}
      initialSidebarOpen={initialSidebarOpen}
      initialSidebarWidth={initialSidebarWidth}
      initialUserStatus={initialUserStatus}
      initialStatusExpiresAt={initialStatusExpiresAt}
    />
  );
}
