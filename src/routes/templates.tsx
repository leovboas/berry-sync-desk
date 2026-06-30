import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getChatwootTemplates, startConversationWithTemplate, createWhatsAppTemplate } from "@/lib/chatwoot.functions";
import { Loader2, LayoutTemplate, ExternalLink, MessageSquarePlus, X, Plus, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Berry" }] }),
  component: () => (
    <AppShell>
      <TemplatesPage />
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

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED: { bg: "#dcfce7", text: "#15803d", label: "Aprovado" },
  PENDING:  { bg: "#fef9c3", text: "#854d0e", label: "Pendente" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b", label: "Reprovado" },
};

const CATEGORIES = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utilidade" },
  { value: "AUTHENTICATION", label: "Autenticação" },
];

const LANGUAGES = [
  { value: "pt_BR", label: "Português (BR)" },
  { value: "en_US", label: "English (US)" },
  { value: "es", label: "Español" },
];

function CreateTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("pt_BR");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const varCount = extractVarCount(body);

  // Sync examples array length with variable count
  const syncedExamples = Array.from({ length: varCount }, (_, i) => examples[i] ?? "");

  const slugName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_");

  const canSave =
    slugName.length >= 1 &&
    body.trim().length >= 1 &&
    (varCount === 0 || syncedExamples.every((e) => e.trim()));

  function preview() {
    return fillTemplate(body, syncedExamples.map((e) => e || `{{exemplo}}`));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await createWhatsAppTemplate({
        data: {
          name: slugName,
          category,
          language,
          header: header.trim() || undefined,
          body: body.trim(),
          footer: footer.trim() || undefined,
          bodyExamples: syncedExamples,
        },
      });
      setSuccess(true);
      setTimeout(() => { onCreated(); onClose(); }, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-[12px] bg-white dark:bg-[#1a1a1a] shadow-xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] dark:border-[#2a2a2a] px-6 py-4">
          <h2 className="font-semibold text-[#090909] dark:text-[#e8e8e8]">Criar template</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-[#666] dark:text-[#909090] hover:bg-[#f0f0f0] dark:hover:bg-[#252525]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="mb-3 h-10 w-10 text-[#00e186]" />
            <p className="font-semibold text-[#090909] dark:text-[#e8e8e8]">Template enviado para aprovação!</p>
            <p className="mt-1 text-sm text-[#666] dark:text-[#909090]">Aparecerá na lista assim que a Meta aprovar.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 gap-6 overflow-hidden px-6 py-5">
              {/* Form */}
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
                {/* Nome */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">
                    Nome do template
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: boas_vindas_lead"
                    className="h-9 text-sm"
                  />
                  {name && name !== slugName && (
                    <p className="mt-1 text-[11px] text-[#999] dark:text-[#686868]">Será salvo como: <span className="font-mono">{slugName}</span></p>
                  )}
                  <p className="mt-1 text-[11px] text-[#999] dark:text-[#686868]">Apenas letras minúsculas, números e _</p>
                </div>

                {/* Categoria + Idioma */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 text-sm"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cabeçalho */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">
                    Cabeçalho <span className="font-normal text-[#999] dark:text-[#686868]">(opcional)</span>
                  </label>
                  <Input
                    value={header}
                    onChange={(e) => setHeader(e.target.value)}
                    placeholder="Texto de cabeçalho"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Corpo */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">Corpo</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={"Olá {{1}}, tudo bem?\n\nUse {{1}}, {{2}} para variáveis."}
                    rows={4}
                    className="w-full rounded-md border border-[#e5e5e5] dark:border-[#2a2a2a] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#090909] dark:focus:ring-[#888]/20"
                  />
                  <p className="mt-1 text-[11px] text-[#999] dark:text-[#686868]">Use {"{{1}}"}, {"{{2}}"} para inserir variáveis</p>
                </div>

                {/* Exemplos de variáveis */}
                {varCount > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">
                      Exemplos das variáveis <span className="font-normal text-[#999] dark:text-[#686868]">(obrigatório para aprovação)</span>
                    </label>
                    {syncedExamples.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[12px] text-[#666] dark:text-[#909090]">{"{{" + (i + 1) + "}}"}</span>
                        <Input
                          value={ex}
                          onChange={(e) => {
                            const next = [...syncedExamples];
                            next[i] = e.target.value;
                            setExamples(next);
                          }}
                          placeholder={`Exemplo para variável ${i + 1}`}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Rodapé */}
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">
                    Rodapé <span className="font-normal text-[#999] dark:text-[#686868]">(opcional)</span>
                  </label>
                  <Input
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="ex: Não responda a este número"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="w-52 shrink-0">
                <p className="mb-2 text-[12px] font-semibold text-[#090909] dark:text-[#e8e8e8]">Preview</p>
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#2a2a2a] bg-[#f0f0f0] dark:bg-[#252525] p-3">
                  <div className="rounded-lg bg-white dark:bg-[#1a1a1a] p-3 shadow-sm">
                    {header.trim() && (
                      <p className="mb-1.5 text-[13px] font-semibold text-[#090909] dark:text-[#e8e8e8]">{header}</p>
                    )}
                    <p className="whitespace-pre-wrap text-[13px] text-[#090909] dark:text-[#e8e8e8]">{preview() || "Corpo do template…"}</p>
                    {footer.trim() && (
                      <p className="mt-1.5 text-[11px] text-[#999] dark:text-[#686868]">{footer}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e5e5e5] dark:border-[#2a2a2a] px-6 py-4">
              {error && <p className="mb-3 text-[12px] text-red-500">{error}</p>}
              <div className="flex items-center justify-end gap-3">
                <button onClick={onClose} className="text-sm text-[#666] dark:text-[#909090] hover:text-[#090909] dark:hover:text-[#e8e8e8]">
                  Cancelar
                </button>
                <Button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="bg-[#090909] text-white hover:bg-[#090909]/90"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Enviar para aprovação
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Use template modal ---

function UseTemplateModal({
  template,
  onClose,
  onStarted,
}: {
  template: any;
  onClose: () => void;
  onStarted: () => void;
}) {
  const body = getBodyText(template);
  const varCount = extractVarCount(body);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [vars, setVars] = useState<string[]>(Array.from({ length: varCount }, () => ""));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart =
    phone.trim().length >= 8 && name.trim().length > 0 && vars.every((v) => v.trim());

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await startConversationWithTemplate({
        data: {
          phone: phone.trim(),
          contactName: name.trim(),
          templateName: template.name,
          templateParams: vars,
          language: template.language ?? "pt_BR",
          category: template.category ?? "MARKETING",
          templateBody: fillTemplate(body, vars),
        },
      });
      onStarted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-[12px] bg-white dark:bg-[#1a1a1a] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#2a2a2a] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999] dark:text-[#686868]">
              Usar template
            </p>
            <p className="font-semibold text-[#090909] dark:text-[#e8e8e8]">{template.name}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[#666] dark:text-[#909090] hover:bg-[#f0f0f0] dark:hover:bg-[#252525]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-lg bg-[#f8f8f8] dark:bg-[#1e1e1e] px-3.5 py-3">
            <p className="text-sm text-[#090909] dark:text-[#e8e8e8]">{fillTemplate(body, vars) || "—"}</p>
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-[#666] dark:text-[#909090]">Nome do contato</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-[#666] dark:text-[#909090]">
              WhatsApp (com código do país e DDD)
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+5511999999999"
              className="h-9 text-sm"
            />
          </div>

          {vars.map((v, i) => (
            <div key={i}>
              <label className="mb-1 block text-[12px] text-[#666] dark:text-[#909090]">Variável {i + 1}</label>
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

          {error && <p className="text-[12px] text-red-500">{error}</p>}

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
        </div>
      </div>
    </div>
  );
}

// --- Template card ---

function TemplateCard({ template, onUse }: { template: any; onUse?: () => void }) {
  const status = (template.status ?? "PENDING").toUpperCase();
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const body = getBodyText(template);

  return (
    <div className="flex flex-col rounded-[10px] border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-[#090909] dark:text-[#e8e8e8]">{template.name}</p>
          <p className="text-[12px] text-[#999] dark:text-[#686868]">
            {template.category} · {template.language}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: style.bg, color: style.text }}
        >
          {style.label}
        </span>
      </div>

      {body && (
        <p className="mb-3 flex-1 line-clamp-3 text-sm text-[#555] dark:text-[#a0a0a0]">{body}</p>
      )}

      {onUse && (
        <button
          onClick={onUse}
          className="mt-auto flex w-fit items-center gap-1.5 rounded-lg bg-[#090909] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#090909]/90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Usar template
        </button>
      )}
    </div>
  );
}

// --- Main page ---

function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useModal, setUseModal] = useState<any | null>(null);
  const [createModal, setCreateModal] = useState(false);

  function loadTemplates() {
    setLoading(true);
    getChatwootTemplates()
      .then(({ templates: t }) => setTemplates(t))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTemplates(); }, []);

  const approved = templates.filter((t) => t.status?.toUpperCase() === "APPROVED");
  const others = templates.filter((t) => t.status?.toUpperCase() !== "APPROVED");

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#090909] dark:text-[#e8e8e8]">Templates</h1>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#090909] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#090909]/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Criar template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#c0c0c0] dark:text-[#505050]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-[#999] dark:text-[#686868]">
          <LayoutTemplate className="mb-3 h-12 w-12 text-[#c0c0c0] dark:text-[#505050]" />
          <p>Nenhum template encontrado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {approved.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-[#090909] dark:text-[#e8e8e8]">Aprovados</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approved.map((t) => (
                  <TemplateCard key={t.id ?? t.name} template={t} onUse={() => setUseModal(t)} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-[#090909] dark:text-[#e8e8e8]">Outros</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((t) => (
                  <TemplateCard key={t.id ?? t.name} template={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {useModal && (
        <UseTemplateModal
          template={useModal}
          onClose={() => setUseModal(null)}
          onStarted={() => {
            setUseModal(null);
            navigate({ to: "/" });
          }}
        />
      )}

      {createModal && (
        <CreateTemplateModal
          onClose={() => setCreateModal(false)}
          onCreated={loadTemplates}
        />
      )}
    </div>
  );
}
