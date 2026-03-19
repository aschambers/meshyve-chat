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
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('dashboard_selection')?.value;
    if (raw) {
      const sel = JSON.parse(decodeURIComponent(raw));
      if (sel?.serverId) {
        initialActiveServer = initialServers.find((s: Server) => s.serverId === sel.serverId) ?? null;
      }
      if (initialActiveServer && sel.type === 'chatroom' && sel.chatroomId) {
        initialPendingChatroomId = sel.chatroomId;
      }
    }
  } catch {}

  return (
    <DashboardClient
      initialUser={session}
      initialServers={initialServers}
      initialActiveServer={initialActiveServer}
      initialPendingChatroomId={initialPendingChatroomId}
    />
  );
}
