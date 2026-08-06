import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Save, Plus } from "lucide-react";
import { tasksApi } from "@/api/tasks";
import type { TaskItem } from "@/api/tasks";

interface Props {
  onCreated: (task: TaskItem) => void;
}

const PRIORITY_OPTIONS = ["HIGH", "MEDIUM", "LOW"];
const CURRENCY_OPTIONS = ["USD", "BRL", "EUR"];
const INP_CLS = "w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500";
const LBL_CLS = "text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function futureISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function LabelInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LBL_CLS}>{label}</label>
      {children}
    </div>
  );
}
function Inp(props: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  const { value, onChange, type = "text", placeholder } = props;
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INP_CLS} />;
}
function Sel(props: { value: string; onChange: (v: string) => void; options: string[] }) {
  const { value, onChange, options } = props;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INP_CLS}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function NewTaskForm({ onCreated }: Props) {
  const { t } = useTranslation();

  const [taskTypeName, setTaskTypeName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [reference, setReference] = useState("");
  const [track, setTrack] = useState("");
  const [subtrack, setSubtrack] = useState("");
  const [ws, setWs] = useState("");
  const [dealId, setDealId] = useState("");
  const [value, setValue] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(futureISO(15));
  const [priority, setPriority] = useState("LOW");
  const [saved, setSaved] = useState(false);

  const taskTypesQ = useQuery({ queryKey: ["task-types"], queryFn: () => tasksApi.getTaskTypes().then((r) => r.data), staleTime: 600000 });
  const companiesQ = useQuery({ queryKey: ["company-list"], queryFn: () => tasksApi.getCompanyList().then((r) => r.data), staleTime: 600000 });
  const csmQ = useQuery({ queryKey: ["csm-list"], queryFn: () => tasksApi.getCsmList().then((r) => r.data), staleTime: 600000 });

  const taskTypes = taskTypesQ.data ?? [];
  const companies = companiesQ.data ?? [];
  const csms = csmQ.data ?? [];

  const resetForm = () => {
    setTaskTypeName(""); setCustomerName(""); setOwnerName("");
    setReference(""); setTrack(""); setSubtrack(""); setWs(""); setDealId("");
    setValue("0"); setCurrency("USD"); setStart(todayISO()); setEnd(futureISO(15)); setPriority("LOW");
  };

  const createMut = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const tt = taskTypes.find((x) => x.tasktype_name === taskTypeName);
      const cc = companies.find((x) => x.company_name === customerName);
      const cs = csms.find((x) => x.csm_name === ownerName);
      const data: Record<string, unknown> = {
        task_tasktype_id: tt ? tt.tasktype_id : 0,
        task_customer_id: cc ? cc.company_id : 0,
        task_owner_id: cs ? cs.csm_id : 0,
        task_start: start,
        task_end: end,
        task_priority: priority,
        task_currency: currency,
      };
      if (reference.trim()) data.task_reference = reference.trim();
      if (track.trim()) data.task_track = track.trim();
      if (subtrack.trim()) data.task_subtrack = subtrack.trim();
      if (ws.trim()) data.task_ws = ws.trim();
      if (dealId.trim()) data.task_deal_id = dealId.trim();
      const v = parseFloat(value);
      if (v && v !== 0) data.task_value = v;
      return tasksApi.createTask(data as never).then((r) => r.data);
    },
    onSuccess: (data) => {
      const result = data as { success: boolean; task_id: number } | null;
      if (result?.success && result.task_id) {
        setSaved(true);
        resetForm();
        void tasksApi.getTask(result.task_id).then((r) => onCreated(r.data));
        setTimeout(() => setSaved(false), 2000);
      }
    },
  });

  const canSave = !!taskTypeName && !!customerName;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">{t("task.new")}</h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabelInput label={t("task.formTaskType")}>
            <select value={taskTypeName} onChange={(e) => setTaskTypeName(e.target.value)} className={INP_CLS}>
              <option value="">{t("common.selectOption")}</option>
              {taskTypes.map((tt) => <option key={tt.tasktype_id} value={tt.tasktype_name}>{tt.tasktype_name}</option>)}
            </select>
          </LabelInput>
          <LabelInput label={t("task.formClient")}>
            <select value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={INP_CLS}>
              <option value="">{t("common.selectOption")}</option>
              {companies.map((c) => <option key={c.company_id} value={c.company_name}>{c.company_name}</option>)}
            </select>
          </LabelInput>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabelInput label={t("task.formOwner")}>
            <select value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={INP_CLS}>
              <option value="">{t("common.selectOption")}</option>
              {csms.map((c) => <option key={c.csm_id} value={c.csm_name}>{c.csm_name}</option>)}
            </select>
          </LabelInput>
          <LabelInput label={t("task.formReference")}>
            <Inp value={reference} onChange={setReference} placeholder="WEB Order, Subscription, Quote, etc..." />
          </LabelInput>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabelInput label="TRACK"><Inp value={track} onChange={setTrack} /></LabelInput>
          <LabelInput label="SUBTRACK"><Inp value={subtrack} onChange={setSubtrack} /></LabelInput>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <LabelInput label="WS / SUBSCRIPTION"><Inp value={ws} onChange={setWs} /></LabelInput>
          <LabelInput label={t("task.formDealId")}><Inp value={dealId} onChange={setDealId} /></LabelInput>
          <LabelInput label={t("task.formValue")}><Inp value={value} onChange={setValue} type="number" /></LabelInput>
          <LabelInput label={t("task.formCurrency")}><Sel value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} /></LabelInput>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <LabelInput label={t("task.formStart")}><Inp value={start} onChange={setStart} type="date" /></LabelInput>
          <LabelInput label={t("task.formEnd")}><Inp value={end} onChange={setEnd} type="date" /></LabelInput>
          <LabelInput label={t("task.formPriority")}><Sel value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} /></LabelInput>
          <div className="col-span-2 flex items-center justify-end gap-2">
            {saved && <p className="text-[10px] text-green-600 dark:text-green-400">{t("task.savedSuccess")}</p>}
            {createMut.isError && <p className="text-[10px] text-red-600 dark:text-red-400">{t("task.saveFailed")}</p>}
            <button
              onClick={() => canSave && createMut.mutate()}
              disabled={!canSave || createMut.isPending}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white transition-colors"
            >
              {createMut.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
              {createMut.isPending ? t("task.savingChanges") : t("task.saveBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
