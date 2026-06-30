import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getAllChatwootConversations } from "@/lib/chatwoot.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn, initialsOf, timeAgo } from "@/lib/utils";
import { Loader2, RefreshCw, Users } from "lucide-react";

export const Route = createFileRoute("/gestao")({
  head: () => ({ meta: [{ title: "Gestor — Berry" }] }),
  component: () => (
    <AppShell>
      <GestaoPage />
    </AppShell>
  ),
});

type AgentRow = { id: string; name: string; status: string };

const STATUS_DOT: Record<string, string> = {
  online: "#00e186",
  away: "#f59e0b",
  offline: "#d1d5db",
};

function GestaoPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [open, pending, { data: agentsData }] = await Promise.all([
        getAllChatwootConversations({ data: { status: "open" } }),
        getAllChatwootConversations({ data: { status: "pending" } }),
        supabase.from("agents").select("id, name, status").order("name"),
      ]);
      setConversations([...open, ...pending]);
      setAgents((agentsData ?? []) as AgentRow[]);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group conversations by Chatwoot assignee id
  const groups: Record<string, { assignee: any; convs: any[] }> = {};
  for (const conv of conversations) {
    const assignee = conv.meta?.assignee ?? null;
    const key = assignee ? String(assignee.id) : "__unassigned__";
    if (!groups[key]) groups[key] = { assignee, convs: [] };
    groups[key].convs.push(conv);
  }

  // Columns: assigned agents sorted by count desc, unassigned last
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "__unassigned__") return 1;
    if (b === "__unassigned__") return -1;
    return groups[b].convs.length - groups[a].convs.length;
  });

  const unassignedCount = groups["__unassigned__"]?.convs.length ?? 0;
  const assignedAgentCount = sortedKeys.filter((k) => k !== "__unassigned__").length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
        <div>
          <h1 className="text-[18px] font-bold text-[#090909]">Visão do Gestor</h1>
          {lastUpdated && (
            <p className="mt-0.5 text-[12px] text-[#999]">
              Atualizado {timeAgo(lastUpdated.toISOString())} atrás
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-sm text-[#090909] hover:bg-[#f5f5f5] disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex shrink-0 items-center gap-8 border-b border-[#e5e5e5] px-6 py-3">
        <StatItem label="Em atendimento" value={conversations.length} />
        <div className="h-8 w-px bg-[#e5e5e5]" />
        <StatItem label="Atendentes com filas" value={assignedAgentCount} />
        <div className="h-8 w-px bg-[#e5e5e5]" />
        <StatItem
          label="Não atribuídos"
          value={unassignedCount}
          highlight={unassignedCount > 0}
        />
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c0c0c0]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Users className="h-12 w-12 text-[#e0e0e0]" />
          <p className="text-sm text-[#999]">Nenhuma conversa em aberto no momento</p>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden p-6">
          {sortedKeys.map((key) => {
            const { assignee, convs } = groups[key];
            const isUnassigned = key === "__unassigned__";
            const name = isUnassigned ? "Não atribuído" : (assignee?.name ?? "Desconhecido");

            // Match to Supabase agent for real-time status dot
            const supabaseAgent = agents.find(
              (a) => a.name.toLowerCase() === name.toLowerCase()
            );
            const dotColor = isUnassigned
              ? "#d1d5db"
              : STATUS_DOT[supabaseAgent?.status ?? "offline"];

            const sorted = [...convs].sort(
              (a, b) => (b.last_activity_at ?? 0) - (a.last_activity_at ?? 0)
            );

            return (
              <div
                key={key}
                className="flex w-[280px] shrink-0 flex-col rounded-[12px] border border-[#e5e5e5] bg-[#f8f8f8]"
              >
                {/* Column header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{
                          background: isUnassigned ? "#e5e5e5" : "#090909",
                          color: isUnassigned ? "#999" : "#fff",
                        }}
                      >
                        {isUnassigned ? "?" : initialsOf(name)}
                      </div>
                      {!isUnassigned && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f8f8f8]"
                          style={{ background: dotColor }}
                        />
                      )}
                    </div>
                    <span className="truncate text-[13px] font-semibold text-[#090909]">
                      {name}
                    </span>
                  </div>
                  <span
                    className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: isUnassigned ? "#f59e0b" : "#090909",
                      color: "#fff",
                    }}
                  >
                    {convs.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 overflow-y-auto p-3">
                  {sorted.map((conv) => {
                    const contactName = conv.meta?.sender?.name ?? "Contato";
                    const lastTs = conv.last_activity_at
                      ? new Date(conv.last_activity_at * 1000).toISOString()
                      : null;
                    const isPending = conv.status === "pending";

                    return (
                      <button
                        key={conv.id}
                        onClick={() => navigate({ to: "/" })}
                        className="rounded-[8px] border border-[#e5e5e5] bg-white p-3 text-left transition-all hover:border-[#090909] hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ background: "#00e186", color: "#090909" }}
                            >
                              {initialsOf(contactName)}
                            </div>
                            <span className="truncate text-[13px] font-medium text-[#090909]">
                              {contactName}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              isPending
                                ? "bg-[#fff3cd] text-[#856404]"
                                : "bg-[#e8f5e9] text-[#2e7d32]"
                            )}
                          >
                            {isPending ? "Pendente" : "Aberto"}
                          </span>
                        </div>

                        {lastTs && (
                          <p className="mt-1.5 text-[11px] text-[#999]">
                            {timeAgo(lastTs)} atrás
                          </p>
                        )}

                        {conv.inbox_id && (
                          <p className="mt-0.5 text-[11px] text-[#ccc]">
                            inbox #{conv.inbox_id}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[#999]">{label}</p>
      <p
        className="text-[22px] font-bold leading-tight"
        style={{ color: highlight ? "#f59e0b" : "#090909" }}
      >
        {value}
      </p>
    </div>
  );
}
