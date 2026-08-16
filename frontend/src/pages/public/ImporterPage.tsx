/**
 * ImporterPage — Public: Painel de Importação de Arquivos
 *
 * Migração completa do Streamlit importer.py para React.
 *
 * Tabs:
 *  1. Status         — histórico, cockpit de status e logs recentes
 *  2. Upload         — envio de arquivo .xlsx para storage/input
 *  3. Agendamento    — agenda uma nova importação (tipo, arquivo, data/hora)
 *  4. Detalhes       — log detalhado e linhas com falha de uma importação selecionada
 *
 * NOTA sobre paths de API:
 *  O apiClient tem baseURL="/bridgeadoption/api", portanto os paths NÃO devem
 *  incluir o prefixo "/api" — use "/public/importer/..." diretamente.
 */
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, Upload, Clock, AlertCircle,
  CheckCircle, Loader2, Download, X,
} from "lucide-react";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportRecord {
  importctrl_id: number;
  importctrl_source: string;
  importctrl_file: string;
  importctrl_status: "PENDING" | "RUNNING" | "FINISHED" | "FAILED" | "CANCELLED";
  importctrl_message: string | null;
  importctrl_started: string | null;
  importctrl_ended: string | null;
  importctrl_started_by: string | null;
}

interface ImportType {
  label: string;
  source: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Pendente (na fila)",
  RUNNING:   "Em execução",
  FINISHED:  "Concluída com sucesso",
  FAILED:    "Concluída com erro",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  RUNNING:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  FINISHED:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FAILED:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-400",
  RUNNING:   "bg-blue-500",
  FINISHED:  "bg-green-500",
  FAILED:    "bg-red-500",
  CANCELLED: "bg-gray-400",
};

const MAX_UPLOAD_MB = 50;

// ─── Styling helpers ──────────────────────────────────────────────────────────

const inputCls =
  "w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg " +
  "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = inputCls;

const btnPrimary =
  "flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white " +
  "text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnGhost =
  "flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 " +
  "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 " +
  "text-xs font-medium rounded-lg transition-colors disabled:opacity-50";

const spinner = <Loader2 size={13} className="animate-spin" />;

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function SectionCaption({ text }: { text: string }) {
  return (
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
      {text}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center italic">{message}</p>
  );
}

// ─── Status Cockpit (Tab 1 charts) ────────────────────────────────────────────

function StatusCockpit({ records }: { records: ImportRecord[] }) {
  const ALL_STATUSES = ["PENDING", "RUNNING", "FINISHED", "FAILED", "CANCELLED"];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL_STATUSES.forEach((s) => (c[s] = 0));
    records.forEach((r) => {
      const s = r.importctrl_status ?? "UNKNOWN";
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [records]);

  const total = records.length;

  const timeline = useMemo(() => {
    const byDate: Record<string, number> = {};
    records.forEach((r) => {
      if (!r.importctrl_started) return;
      const date = r.importctrl_started.slice(0, 10);
      byDate[date] = (byDate[date] ?? 0) + 1;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [records]);

  const maxTimeline = Math.max(...timeline.map(([, v]) => v), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <SectionCaption text="Importações por status" />
        <div className="space-y-2">
          {ALL_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 w-36 shrink-0 truncate">
                {STATUS_LABELS[s]}
              </span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-4 overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${STATUS_BAR_COLORS[s]}`}
                  style={{ width: total ? `${(counts[s] / total) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-5 text-right">
                {counts[s]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <SectionCaption text="Importações por dia (últimos 14 dias)" />
        {timeline.length === 0 ? (
          <EmptyState message="Nenhuma importação no período." />
        ) : (
          <div className="flex items-end gap-1 h-24">
            {timeline.map(([date, count]) => (
              <div key={date} className="flex flex-col items-center flex-1 gap-0.5" title={`${date}: ${count}`}>
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">{count}</span>
                <div
                  className="w-full bg-blue-500 dark:bg-blue-600 rounded-t"
                  style={{ height: `${(count / maxTimeline) * 64}px` }}
                />
                <span className="text-[8px] text-gray-400 truncate w-full text-center">
                  {date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Import History Table ─────────────────────────────────────────────────────

function HistoryTable({
  records,
  selectedId,
  onSelect,
}: {
  records: ImportRecord[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (!records.length) {
    return <EmptyState message="Nenhuma importação registrada ainda." />;
  }

  return (
    <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-72">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            {["ID", "Fonte", "Arquivo", "Status", "Agendado / Iniciado", "Finalizado", "Responsável"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const isSel = selectedId === r.importctrl_id;
            return (
              <tr
                key={r.importctrl_id}
                onClick={() => onSelect(isSel ? null : r.importctrl_id)}
                className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  isSel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <td className="px-3 py-1.5 font-mono text-gray-500">{r.importctrl_id}</td>
                <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{r.importctrl_source}</td>
                <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[160px] truncate" title={r.importctrl_file}>{r.importctrl_file}</td>
                <td className="px-3 py-1.5"><StatusBadge status={r.importctrl_status} /></td>
                <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{r.importctrl_started ? r.importctrl_started.replace("T", " ").slice(0, 16) : "—"}</td>
                <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{r.importctrl_ended ? r.importctrl_ended.replace("T", " ").slice(0, 16) : "—"}</td>
                <td className="px-3 py-1.5 text-gray-500">{r.importctrl_started_by ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Schedule Tab helpers ─────────────────────────────────────────────────────

function generateDateOptions(daysAhead = 7): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function generateTimeSlots(date: string, occupiedIso: string[]): string[] {
  const now = new Date();
  const occupiedSet = new Set(occupiedIso);
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const slotDt = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      if (slotDt <= now) continue;
      if (occupiedSet.has(slotDt.toISOString().slice(0, 19))) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function formatDateDisplay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({ onUploaded }: { onUploaded: (name: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation<{ saved_name: string }, Error, File>({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append("file", f);
      const res = await apiClient.post<{ saved_name: string }>(
        "/public/importer/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setLastUploadedName(data.saved_name);
      onUploaded(data.saved_name);
      setFile(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => setError(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) { setFile(null); return; }
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setError("Apenas arquivos .xlsx são aceitos."); setFile(null); return;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo: ${MAX_UPLOAD_MB} MB.`); setFile(null); return;
    }
    setFile(f);
  };

  return (
    <div className="space-y-4">
      <SectionCaption text="Upload de arquivo (.xlsx)" />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Envie o arquivo Excel (.xlsx). Tamanho máximo: <strong>{MAX_UPLOAD_MB} MB</strong>.
      </p>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => fileRef.current?.click()}>
        <Upload size={32} className="text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {file ? <span className="text-blue-600 dark:text-blue-400 font-medium">{file.name}</span> : "Clique ou arraste um arquivo .xlsx aqui"}
        </p>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={13} /> {error}
        </div>
      )}
      {file && (
        <div className="flex items-center gap-3">
          <button onClick={() => uploadMut.mutate(file)} disabled={uploadMut.isPending} className={btnPrimary}>
            {uploadMut.isPending ? spinner : <Upload size={13} />}
            {uploadMut.isPending ? "Enviando..." : "Enviar arquivo"}
          </button>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} disabled={uploadMut.isPending} className={btnGhost}>
            <X size={13} /> Cancelar
          </button>
        </div>
      )}
      {lastUploadedName && !uploadMut.isPending && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">
          <CheckCircle size={13} />
          Arquivo <strong>'{lastUploadedName}'</strong> enviado com sucesso.
        </div>
      )}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ lastUploadedFile, onScheduled }: { lastUploadedFile: string | null; onScheduled: () => void }) {
  const [selSource, setSelSource] = useState<string>("");
  const [selDate, setSelDate] = useState<string>("");
  const [selTime, setSelTime] = useState<string>("");
  const [selFile, setSelFile] = useState<string>("");
  const [flashMsg, setFlashMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const qc = useQueryClient();

  const importTypesQ = useQuery<ImportType[]>({
    queryKey: ["importer-types"],
    queryFn: () => apiClient.get<ImportType[]>("/public/importer/import-types").then((r) => r.data),
    staleTime: 600000,
  });
  const filesQ = useQuery<string[]>({
    queryKey: ["importer-files"],
    queryFn: () => apiClient.get<string[]>("/public/importer/files").then((r) => r.data),
    staleTime: 30000,
  });
  const slotsQ = useQuery<string[]>({
    queryKey: ["importer-occupied-slots"],
    queryFn: () => apiClient.get<string[]>("/public/importer/occupied-slots?days_ahead=7").then((r) => r.data),
    staleTime: 30000,
  });

  const scheduleMut = useMutation<{ importctrl_id: number }, Error, { source: string; file_name: string; scheduled_at: string }>({
    mutationFn: (body) => apiClient.post<{ importctrl_id: number }>("/public/importer/schedule", body).then((r) => r.data),
    onSuccess: (data) => {
      setFlashMsg({ type: "success", text: `Importação agendada com sucesso! ID: ${data.importctrl_id}` });
      setSelSource(""); setSelDate(""); setSelTime(""); setSelFile("");
      void qc.invalidateQueries({ queryKey: ["importer-files"] });
      void qc.invalidateQueries({ queryKey: ["importer-occupied-slots"] });
      void qc.invalidateQueries({ queryKey: ["importer-history"] });
      onScheduled();
    },
    onError: (e) => setFlashMsg({ type: "error", text: e.message }),
  });

  const dateOptions = generateDateOptions(7);
  const occupiedSlots = slotsQ.data ?? [];
  const timeSlots = selDate ? generateTimeSlots(selDate, occupiedSlots) : [];
  const availableFiles = filesQ.data ?? [];
  const fileOptions = lastUploadedFile && !availableFiles.includes(lastUploadedFile)
    ? [lastUploadedFile, ...availableFiles] : availableFiles;
  const canSchedule = selSource && selDate && selTime && selFile && !scheduleMut.isPending;

  return (
    <div className="space-y-4">
      <SectionCaption text="Agendamento de importação" />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        O processamento é feito em <em>background</em> pelo <strong>cron</strong> no servidor Linux.
      </p>
      {flashMsg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${flashMsg.type === "success" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"}`}>
          {flashMsg.type === "success" ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {flashMsg.text}
          <button onClick={() => setFlashMsg(null)} className="ml-auto"><X size={11} /></button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Tipo de importação</label>
          <select value={selSource} onChange={(e) => setSelSource(e.target.value)} className={selectCls}>
            <option value="">Selecione o tipo...</option>
            {(importTypesQ.data ?? []).map((t) => <option key={t.source} value={t.source}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Arquivo para importação</label>
          {filesQ.isLoading ? <div className="text-xs text-gray-400 py-1.5">Carregando...</div>
            : fileOptions.length === 0 ? <div className="text-xs text-yellow-700 dark:text-yellow-300 py-1.5">Nenhum arquivo disponível. Faça upload primeiro.</div>
            : <select value={selFile} onChange={(e) => setSelFile(e.target.value)} className={selectCls}>
                <option value="">Selecione o arquivo...</option>
                {fileOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
          }
        </div>
        <div>
          <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Data de agendamento</label>
          <select value={selDate} onChange={(e) => { setSelDate(e.target.value); setSelTime(""); }} className={selectCls}>
            <option value="">Selecione a data...</option>
            {dateOptions.map((d) => <option key={d} value={d}>{formatDateDisplay(d)}{d === new Date().toISOString().slice(0, 10) ? " (hoje)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Hora de agendamento</label>
          {!selDate ? <div className="text-xs text-gray-400 py-1.5 italic">Selecione uma data primeiro.</div>
            : slotsQ.isLoading ? <div className="text-xs text-gray-400 py-1.5">Carregando...</div>
            : timeSlots.length === 0 ? <div className="text-xs text-yellow-700 dark:text-yellow-300 py-1.5">Nenhum horário disponível.</div>
            : <select value={selTime} onChange={(e) => setSelTime(e.target.value)} className={selectCls}>
                <option value="">Selecione o horário...</option>
                {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
          }
        </div>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        O cron iniciará importações cuja data/hora seja ≤ o momento atual.
      </p>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => { if (!canSchedule) return; scheduleMut.mutate({ source: selSource, file_name: selFile, scheduled_at: `${selDate}T${selTime}:00` }); }} disabled={!canSchedule} className={btnPrimary}>
          {scheduleMut.isPending ? spinner : <Clock size={13} />}
          {scheduleMut.isPending ? "Agendando..." : "Agendar importação"}
        </button>
        {scheduleMut.isError && <span className="text-xs text-red-600 dark:text-red-400">{scheduleMut.error?.message}</span>}
      </div>
    </div>
  );
}

// ─── Details Tab ─────────────────────────────────────────────────────────────

interface LogData { found: boolean; content: string; log_path: string | null; error: string | null }
interface FailedRowsData { found: boolean; rows: Record<string, unknown>[]; columns: string[]; failed_path: string | null; error: string | null }

function DetailsTab({ records }: { records: ImportRecord[] }) {
  const [selId, setSelId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"log" | "failed">("log");
  const selRecord = records.find((r) => r.importctrl_id === selId) ?? null;

  const logQ = useQuery<LogData>({
    queryKey: ["importer-log", selId],
    queryFn: () => apiClient.get<LogData>(`/public/importer/${selId}/log`).then((r) => r.data),
    enabled: selId !== null && activeSection === "log",
    staleTime: 15000,
  });
  const failedQ = useQuery<FailedRowsData>({
    queryKey: ["importer-failed", selId],
    queryFn: () => apiClient.get<FailedRowsData>(`/public/importer/${selId}/failed-rows`).then((r) => r.data),
    enabled: selId !== null && activeSection === "failed",
    staleTime: 15000,
  });
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => (b.importctrl_started ?? "").localeCompare(a.importctrl_started ?? "")),
    [records],
  );

  return (
    <div className="space-y-4">
      <SectionCaption text="Detalhes da importação e arquivos de erro" />
      <div>
        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Selecione a importação</label>
        <select value={selId ?? ""} onChange={(e) => { setSelId(e.target.value ? Number(e.target.value) : null); setActiveSection("log"); }} className={selectCls}>
          <option value="">Selecione...</option>
          {sortedRecords.map((r) => (
            <option key={r.importctrl_id} value={r.importctrl_id}>
              ID {r.importctrl_id} | {r.importctrl_file} | {STATUS_LABELS[r.importctrl_status] ?? r.importctrl_status} | {r.importctrl_started?.replace("T", " ").slice(0, 16) ?? "—"}
            </option>
          ))}
        </select>
      </div>
      {selRecord && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-gray-400">Arquivo:</span><br /><strong className="text-gray-700 dark:text-gray-300">{selRecord.importctrl_file}</strong></div>
            <div><span className="text-gray-400">Fonte:</span><br /><strong className="text-gray-700 dark:text-gray-300">{selRecord.importctrl_source}</strong></div>
            <div><span className="text-gray-400">Status:</span><br /><StatusBadge status={selRecord.importctrl_status} /></div>
            <div><span className="text-gray-400">Responsável:</span><br /><strong className="text-gray-700 dark:text-gray-300">{selRecord.importctrl_started_by ?? "—"}</strong></div>
            <div><span className="text-gray-400">Início:</span><br /><span className="text-gray-600 dark:text-gray-300">{selRecord.importctrl_started?.replace("T", " ").slice(0, 19) ?? "—"}</span></div>
            <div><span className="text-gray-400">Fim:</span><br /><span className="text-gray-600 dark:text-gray-300">{selRecord.importctrl_ended?.replace("T", " ").slice(0, 19) ?? "—"}</span></div>
            {selRecord.importctrl_message && <div className="col-span-2 md:col-span-4"><span className="text-gray-400">Mensagem:</span><br /><span className="text-gray-600 dark:text-gray-300">{selRecord.importctrl_message}</span></div>}
          </div>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {(["log", "failed"] as const).map((s) => (
              <button key={s} onClick={() => setActiveSection(s)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeSection === s ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                {s === "log" ? "📄 Log (.log)" : "⚠️ Linhas com falha (.xlsx)"}
              </button>
            ))}
          </div>
          {activeSection === "log" && (
            <div>
              {logQ.isLoading && <div className="text-xs text-gray-400 py-2 flex items-center gap-1">{spinner} Carregando log...</div>}
              {logQ.isError && <div className="text-xs text-red-500 py-2">Erro: {logQ.error?.message}</div>}
              {logQ.data && !logQ.data.found && <div className="text-xs text-gray-400 italic py-2">Nenhum arquivo de log encontrado.</div>}
              {logQ.data?.found && <textarea readOnly value={logQ.data.content} className={`${inputCls} font-mono h-64 resize-y`} />}
            </div>
          )}
          {activeSection === "failed" && (
            <div className="space-y-2">
              {failedQ.isLoading && <div className="text-xs text-gray-400 py-2 flex items-center gap-1">{spinner} Carregando...</div>}
              {failedQ.isError && <div className="text-xs text-red-500 py-2">Erro: {failedQ.error?.message}</div>}
              {failedQ.data && !failedQ.data.found && <div className="text-xs text-gray-400 italic py-2">Nenhum arquivo de falhas encontrado.</div>}
              {failedQ.data?.found && failedQ.data.rows.length === 0 && <div className="text-xs text-gray-400 italic py-2">Arquivo de falhas vazio.</div>}
              {failedQ.data?.found && failedQ.data.rows.length > 0 && (
                <>
                  <p className="text-xs text-gray-500">{failedQ.data.rows.length} linha(s) com falha.</p>
                  <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-96">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>{failedQ.data.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {failedQ.data.rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            {failedQ.data!.columns.map((c) => <td key={c} className="px-3 py-1.5 whitespace-nowrap text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{row[c] == null ? <span className="text-gray-300">—</span> : String(row[c])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => apiClient.get(`/public/importer/${selId}/failed-rows`).then(r => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)])); a.download = `failed_rows_${selId}.json`; a.click(); })} className={btnGhost}>
                    <Download size={13} /> Baixar linhas com falha
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {!selRecord && <EmptyState message="Selecione uma importação para ver detalhes." />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImporterPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"status" | "upload" | "schedule" | "details">("status");
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);

  const historyQ = useQuery<ImportRecord[]>({
    queryKey: ["importer-history"],
    queryFn: () => apiClient.get<ImportRecord[]>("/public/importer/history?limit=100").then((r) => r.data),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const records = historyQ.data ?? [];
  const tabs = [
    { key: "status" as const,   label: "1. Status / andamento" },
    { key: "upload" as const,   label: "2. Upload de arquivo (.xlsx)" },
    { key: "schedule" as const, label: "3. Agendamento de importação" },
    { key: "details" as const,  label: "4. Detalhes / arquivos de erro" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Painel de Importação de Arquivos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie uploads, agendamentos e acompanhe o andamento das importações.</p>
        </div>
        <button onClick={() => void qc.invalidateQueries({ queryKey: ["importer-history"] })} disabled={historyQ.isFetching} className={btnGhost}>
          <RefreshCw size={13} className={historyQ.isFetching ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>
      {historyQ.isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={13} /> Não foi possível carregar o histórico de importações.
        </div>
      )}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 px-4 pt-3 gap-1">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${activeTab === key ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === "status" && (
            <div className="space-y-4">
              <StatusCockpit records={records} />
              <div>
                <SectionCaption text="Histórico de importações" />
                {historyQ.isLoading
                  ? <div className="text-xs text-gray-400 py-4 flex items-center gap-2">{spinner} Carregando...</div>
                  : <HistoryTable records={records} selectedId={null} onSelect={() => {}} />}
              </div>
            </div>
          )}
          {activeTab === "upload" && <UploadTab onUploaded={(name) => { setLastUploadedFile(name); setActiveTab("schedule"); }} />}
          {activeTab === "schedule" && <ScheduleTab lastUploadedFile={lastUploadedFile} onScheduled={() => { setLastUploadedFile(null); setActiveTab("status"); }} />}
          {activeTab === "details" && <DetailsTab records={records} />}
        </div>
      </div>
    </div>
  );
}
