import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initialsOf, timeAgo } from "@/lib/utils";
import { searchHubSpotContacts, getMyHubSpotContacts } from "@/lib/hubspot.functions";
import { getChatwootTemplates, startConversationWithTemplate } from "@/lib/chatwoot.functions";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Loader2, MessageSquarePlus, X, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/contatos")({
  head: () => ({ meta: [{ title: "Contatos — Berry" }] }),
  component: () => (
    <AppShell>
      <ContatosPage />
    </AppShell>
  ),
});

// --- helpers ---

function extractVarCount(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => parseInt(m.replace(/[{}]/g, ""))));
}

function fillTemplate(text: string, vars: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[parseInt(n) - 1] ?? `{{${n}}}`);
}

function getBodyText(t: any): string {
  return t.components?.find((c: any) => c.type === "BODY")?.text ?? t.body ?? "";
}

// --- Template picker modal ---

function TemplateModal({
  contact,
  onClose,
  onStarted,
}: {
  contact: any;
  onClose: () => void;
  onStarted: (convId: number) => void;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [vars, setVars] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getChatwootTemplates()
      .then(({ templates: t }) =>
        setTemplates(t.filter((tp: any) => tp.status?.toUpperCase() === "APPROVED"))
      )
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function selectTemplate(t: any) {
    const count = extractVarCount(getBodyText(t));
    setSelected(t);
    setVars(Array.from({ length: count }, () => ""));
    setError(null);
  }

  async function handleStart() {
    if (!selected) return;
    const phone = contact.properties?.phone ?? "";
    const name =
      [contact.properties?.firstname, contact.properties?.lastname].filter(Boolean).join(" ") ||
      "Contato";
    const body = fillTemplate(getBodyText(selected), vars);
    setStarting(true);
    setError(null);
    try {
      const { conversationId } = await startConversationWithTemplate({
        data: {
          phone,
          contactName: name,
          templateName: selected.name,
          templateParams: vars,
          language: selected.language ?? "pt_BR",
          category: selected.category ?? "MARKETING",
          templateBody: body,
        },
      });
      onStarted(conversationId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  const contactName =
    [contact.properties?.firstname, contact.properties?.lastname].filter(Boolean).join(" ") ||
    "Contato";

  const canStart = !!selected && vars.every((v) => v.trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-[12px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
          <div>
            <p className="text-[13px] text-[#666]">Iniciar conversa com</p>
            <p className="font-semibold text-[#090909]">{contactName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[#666] hover:bg-[#f0f0f0]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {!selected ? (
            <>
              <p className="mb-3 text-sm font-medium text-[#090909]">Escolha o template</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#c0c0c0]" />
                </div>
              ) : templates.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#999]">
                  Nenhum template aprovado encontrado.
                </p>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id ?? t.name}
                      onClick={() => selectTemplate(t)}
                      className="flex w-full items-center justify-between rounded-lg border border-[#e5e5e5] px-3.5 py-3 text-left hover:border-[#090909] hover:bg-[#fafafa]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#090909]">{t.name}</p>
                        <p className="mt-0.5 text-[12px] text-[#999]">
                          {t.category} · {t.language}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#ccc]" />
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}
            </>
          ) : (
            <>
              <button
                onClick={() => { setSelected(null); setError(null); }}
                className="mb-3 text-[13px] text-[#666] hover:text-[#090909]"
              >
                ← Voltar aos templates
              </button>

              <div className="mb-4 rounded-lg bg-[#f8f8f8] px-3.5 py-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#999]">
                  {selected.name}
                </p>
                <p className="text-sm text-[#090909]">
                  {fillTemplate(getBodyText(selected), vars) || "—"}
                </p>
              </div>

              {vars.length > 0 && (
                <div className="mb-4 space-y-2">
                  {vars.map((v, i) => (
                    <div key={i}>
                      <label className="mb-1 block text-[12px] text-[#666]">
                        Variável {i + 1}
                      </label>
                      <Input
                        value={v}
                        onChange={(e) => {
                          const next = [...vars];
                          next[i] = e.target.value;
                          setVars(next);
                        }}
                        placeholder={`{{${i + 1}}}`}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="mb-3 text-[12px] text-red-500">{error}</p>}

              <Button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full bg-[#090909] text-white hover:bg-[#090909]/90"
              >
                {starting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                )}
                Iniciar conversa
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main page ---

function ContatosPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [myContacts, setMyContacts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [convModal, setConvModal] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoadingMy(false); return; }
      // Use hubspot_email if configured, otherwise fall back to auth email
      const { data: agent } = await supabase
        .from("agents")
        .select("hubspot_email")
        .eq("id", u.user.id)
        .maybeSingle();
      const ownerEmail = (agent as any)?.hubspot_email || u.user.email || "";
      if (!ownerEmail) { setLoadingMy(false); return; }
      try {
        const result = await getMyHubSpotContacts({ data: { ownerEmail } });
        setMyContacts(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMy(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!q.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setLoadingSearch(true);
      searchHubSpotContacts({ data: { q: q.trim() } })
        .then(setSearchResults)
        .catch(console.error)
        .finally(() => setLoadingSearch(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  const contacts = q.trim() ? searchResults : myContacts;
  const loading = q.trim() ? loadingSearch : loadingMy;
  const title = q.trim() ? "Busca de contatos" : "Meus contatos";

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <h1 className="mb-6 text-[22px] font-bold text-[#090909]">{title}</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, empresa ou telefone…"
          className="h-11 pl-10"
        />
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#e5e5e5] bg-[#f8f8f8]">
            <tr>
              <Th>Nome</Th>
              <Th>Empresa</Th>
              <Th>Telefone</Th>
              <Th>E-mail</Th>
              <Th>Status CRM</Th>
              <Th>Último contato</Th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#666]">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#c0c0c0]" />
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#666]">
                  <Users className="mx-auto mb-3 h-10 w-10 text-[#c0c0c0]" />
                  {q.trim()
                    ? "Nenhum contato encontrado."
                    : "Você não tem contatos atribuídos na HubSpot."}
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const firstName = c.properties?.firstname ?? "";
                const lastName = c.properties?.lastname ?? "";
                const name = [firstName, lastName].filter(Boolean).join(" ") || "Sem nome";
                const company = c.properties?.company ?? "—";
                const phone = c.properties?.phone ?? "—";
                const email = c.properties?.email ?? "—";
                const status = c.properties?.hs_lead_status ?? "—";
                const lastContact = c.properties?.notes_last_updated;

                return (
                  <tr
                    key={c.id}
                    className="border-b border-[#e5e5e5] last:border-0 hover:bg-[#fafafa]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{ background: "#00e186", color: "#090909" }}
                        >
                          {initialsOf(name)}
                        </div>
                        <span className="font-medium text-[#090909]">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#090909]">{company}</td>
                    <td className="px-4 py-3 text-[#666]">{phone}</td>
                    <td className="px-4 py-3 text-[#666]">{email}</td>
                    <td className="px-4 py-3">
                      {status !== "—" ? (
                        <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11px] font-medium text-[#444]">
                          {status}
                        </span>
                      ) : (
                        <span className="text-[#999]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#666]">
                      {lastContact ? `${timeAgo(lastContact)} atrás` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {phone !== "—" && (
                        <button
                          onClick={() => setConvModal(c)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-[12px] font-medium text-[#090909] transition-colors hover:border-[#090909] hover:bg-[#090909] hover:text-white"
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                          Iniciar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {convModal && (
        <TemplateModal
          contact={convModal}
          onClose={() => setConvModal(null)}
          onStarted={() => {
            setConvModal(null);
            navigate({ to: "/" });
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#666]">
      {children}
    </th>
  );
}
