/**
 * UseCasesPage — Adoption: Use Cases
 * Migração completa do Streamlit use_case.py para React.
 *
 * Estrutura:
 *  1. Filtros cascata: Vendor → Architecture → Primary Product → Use Case
 *  2. Navegação prev/next pelos use cases filtrados
 *  3. Seção "Description" — campos readonly do use case atual
 *  4. Seção "Applicability" — grid 2×3 de text areas
 *  5. Seção "Exit Criteria" — navegação própria + campos readonly
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vendor {
  vendor_id: number;
  vendor_name: string;
}

interface UseCase {
  uc_id: number;
  uc_vendor_id: number;
  uc_vendor_name: string;
  uc_architecture: string | null;
  uc_solution_domain: string | null;
  uc_use_case: string | null;
  uc_primary_product_id: number | null;
  uc_primary_product_name: string | null;
  uc_description: string | null;
  uc_key_supporting_products: string | null;
  uc_key_capabilities: string | null;
  uc_it_operations_benefits: string | null;
  uc_business_benefits: string | null;
  uc_success_metrics: string | null;
  uc_business_outcomes: string | null;
}

interface ExitCriteria {
  ucec_id: number;
  ucec_uc_id: number;
  ucec_tasktype_id: number | null;
  ucec_tasktype_name: string | null;
  ucec_seq: number | null;
  ucec_name: string | null;
  ucec_objective: string | null;
  ucec_scope: string | null;
  ucec_expected_results: string | null;
  ucec_update_date: string | null;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const cardCls =
  "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5";

const selectCls =
  "w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg " +
  "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 " +
  "focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

const fieldLabelCls =
  "text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

const fieldValueCls =
  "w-full text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 " +
  "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 " +
  "resize-none focus:outline-none";

// ─── InlineField (label col-left + value col-right) ──────────────────────────
function InlineField({
  label,
  value,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  rows?: number;
}) {
  const text = value ?? "";
  return (
    <div className="flex items-start gap-3">
      <span className={fieldLabelCls + " min-w-[140px] w-[140px] pt-2 shrink-0"}>
        {label}
      </span>
      {multiline ? (
        <textarea readOnly value={text} rows={rows} className={fieldValueCls + " flex-1"} />
      ) : (
        <input readOnly type="text" value={text} className={fieldValueCls + " flex-1"} />
      )}
    </div>
  );
}

// ─── ReadonlyField (label top + value below) ──────────────────────────────────
function ReadonlyField({
  label,
  value,
  multiline = false,
  rows = 4,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  rows?: number;
}) {
  const text = value ?? "";
  return (
    <div className="flex flex-col gap-1">
      <span className={fieldLabelCls}>{label}</span>
      {multiline ? (
        <textarea readOnly value={text} rows={rows} className={fieldValueCls} />
      ) : (
        <input readOnly type="text" value={text} className={fieldValueCls} />
      )}
    </div>
  );
}

// ─── NavBar — prev/next with record counter ───────────────────────────────────
interface NavBarProps {
  index: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}
function NavBar({ index, total, label, onPrev, onNext }: NavBarProps) {
  const { t } = useTranslation();
  const btnBase =
    "flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors " +
    "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 " +
    "hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <button className={btnBase} disabled={index === 0} onClick={onPrev}>
        <ChevronLeft size={13} />
        {t("common.previous")} {label}
      </button>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        {label} {index + 1} {t("common.of", "of")} {total}
      </span>
      <button className={btnBase} disabled={index >= total - 1} onClick={onNext}>
        {t("common.next")} {label}
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
      {children}
    </h3>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UseCasesPage() {
  const { t } = useTranslation();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [selArchitecture, setSelArchitecture] = useState("");
  const [selPrimaryProduct, setSelPrimaryProduct] = useState("");
  const [selUseCase, setSelUseCase] = useState("");

  // ── Navigation state ────────────────────────────────────────────────────────
  const [ucIndex, setUcIndex] = useState(0);
  const [ecIndex, setEcIndex] = useState(0);

  // ── Refresh trigger ──────────────────────────────────────────────────────────
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const vendorsQ = useQuery({
    queryKey: ["uc-vendors", refreshKey],
    queryFn: () =>
      apiClient.get<Vendor[]>("/adoption/use-cases/vendors").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const useCasesQ = useQuery({
    queryKey: ["uc-by-vendor", vendorId, refreshKey],
    queryFn: () =>
      apiClient
        .get<UseCase[]>(`/adoption/use-cases?vendor_id=${vendorId}`)
        .then((r) => r.data),
    enabled: vendorId !== null,
    staleTime: 5 * 60 * 1000,
  });

  const vendors = vendorsQ.data ?? [];
  const allUseCases = useCasesQ.data ?? [];

  // ── Cascading filter derivations ─────────────────────────────────────────────
  const architectures = useMemo(
    () =>
      [...new Set(allUseCases.map((u) => u.uc_architecture).filter(Boolean))].sort() as string[],
    [allUseCases],
  );

  const filteredByArch = useMemo(
    () =>
      selArchitecture
        ? allUseCases.filter((u) => u.uc_architecture === selArchitecture)
        : allUseCases,
    [allUseCases, selArchitecture],
  );

  const primaryProducts = useMemo(
    () =>
      [
        ...new Set(filteredByArch.map((u) => u.uc_primary_product_name).filter(Boolean)),
      ].sort() as string[],
    [filteredByArch],
  );

  const filteredByProduct = useMemo(
    () =>
      selPrimaryProduct
        ? filteredByArch.filter((u) => u.uc_primary_product_name === selPrimaryProduct)
        : filteredByArch,
    [filteredByArch, selPrimaryProduct],
  );

  const useCaseOptions = useMemo(
    () =>
      [
        ...new Set(filteredByProduct.map((u) => u.uc_use_case).filter(Boolean)),
      ].sort() as string[],
    [filteredByProduct],
  );

  const filteredUseCases = useMemo(
    () =>
      selUseCase
        ? filteredByProduct.filter((u) => u.uc_use_case === selUseCase)
        : filteredByProduct,
    [filteredByProduct, selUseCase],
  );

  // ── Safe UC index & current record ───────────────────────────────────────────
  const safeUcIndex = Math.min(ucIndex, Math.max(0, filteredUseCases.length - 1));
  const currentUC: UseCase | null = filteredUseCases[safeUcIndex] ?? null;

  // ── Exit criteria query ───────────────────────────────────────────────────────
  const ucIds = filteredUseCases.map((u) => u.uc_id);

  const ecQ = useQuery({
    queryKey: ["uc-exit-criteria", ucIds.join(","), refreshKey],
    queryFn: () =>
      apiClient
        .get<ExitCriteria[]>(
          `/adoption/use-cases/exit-criteria?uc_ids=${ucIds.join(",")}`,
        )
        .then((r) => r.data),
    enabled: ucIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const allEC = ecQ.data ?? [];

  const currentEC = useMemo(
    () => (currentUC ? allEC.filter((e) => e.ucec_uc_id === currentUC.uc_id) : []),
    [allEC, currentUC],
  );

  const safeEcIndex = Math.min(ecIndex, Math.max(0, currentEC.length - 1));
  const currentECRecord: ExitCriteria | null = currentEC[safeEcIndex] ?? null;

  // ── Event handlers ────────────────────────────────────────────────────────────
  const handleVendorChange = (id: number | null) => {
    setVendorId(id);
    setSelArchitecture("");
    setSelPrimaryProduct("");
    setSelUseCase("");
    setUcIndex(0);
    setEcIndex(0);
  };

  const handleArchChange = (v: string) => {
    setSelArchitecture(v);
    setSelPrimaryProduct("");
    setSelUseCase("");
    setUcIndex(0);
    setEcIndex(0);
  };

  const handleProductChange = (v: string) => {
    setSelPrimaryProduct(v);
    setSelUseCase("");
    setUcIndex(0);
    setEcIndex(0);
  };

  const handleUseCaseChange = (v: string) => {
    setSelUseCase(v);
    setUcIndex(0);
    setEcIndex(0);
  };

  const handleUcPrev = () => { setUcIndex((i) => Math.max(0, i - 1)); setEcIndex(0); };
  const handleUcNext = () => { setUcIndex((i) => Math.min(filteredUseCases.length - 1, i + 1)); setEcIndex(0); };
  const handleEcPrev = () => setEcIndex((i) => Math.max(0, i - 1));
  const handleEcNext = () => setEcIndex((i) => Math.min(currentEC.length - 1, i + 1));

  const spinner = (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ucLabel = t("adoption.useCases.useCase", "Use Case");
  const stageLabel = t("adoption.useCases.stage", "Stage");
  const hasData = vendorId !== null && !useCasesQ.isLoading && filteredUseCases.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("adoption.useCases.title", "Use Cases")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("adoption.useCases.subtitle", "Customer Use Case Applicability & Exit Criteria")}
          </p>
        </div>
        <button
          onClick={() => { setRefreshKey((k) => k + 1); setUcIndex(0); setEcIndex(0); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={13} /> {t("common.refresh", "Refresh")}
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={fieldLabelCls + " block mb-1"}>{t("adoption.useCases.vendor", "Vendor")}</label>
            {vendorsQ.isLoading ? spinner : (
              <select className={selectCls} value={vendorId ?? ""} onChange={e => handleVendorChange(e.target.value ? Number(e.target.value) : null)}>
                <option value="">{t("adoption.useCases.selectVendor", "-- Select Vendor --")}</option>
                {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className={fieldLabelCls + " block mb-1"}>{t("adoption.useCases.architecture", "Architecture")}</label>
            <select className={selectCls} value={selArchitecture} disabled={!vendorId || useCasesQ.isLoading} onChange={e => handleArchChange(e.target.value)}>
              <option value="">{t("adoption.useCases.allArchitectures", "All Architectures")}</option>
              {architectures.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={fieldLabelCls + " block mb-1"}>{t("adoption.useCases.primaryProduct", "Primary Product")}</label>
            <select className={selectCls} value={selPrimaryProduct} disabled={!vendorId || useCasesQ.isLoading} onChange={e => handleProductChange(e.target.value)}>
              <option value="">{t("adoption.useCases.allProducts", "All Products")}</option>
              {primaryProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={fieldLabelCls + " block mb-1"}>{ucLabel}</label>
            <select className={selectCls} value={selUseCase} disabled={!vendorId || useCasesQ.isLoading} onChange={e => handleUseCaseChange(e.target.value)}>
              <option value="">{t("adoption.useCases.allUseCases", "All Use Cases")}</option>
              {useCaseOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {vendorId !== null && useCasesQ.isLoading && spinner}

      {/* No data */}
      {vendorId !== null && !useCasesQ.isLoading && filteredUseCases.length === 0 && (
        <div className={cardCls}>
          <p className="text-center text-xs text-gray-400 py-8">{t("common.noData", "No data available.")}</p>
        </div>
      )}

      {/* ── Data sections ──────────────────────────────────────────────── */}
      {hasData && currentUC && (
        <>
          {/* UC Navigation top */}
          <div className={cardCls}>
            <NavBar index={safeUcIndex} total={filteredUseCases.length} label={ucLabel} onPrev={handleUcPrev} onNext={handleUcNext} />
          </div>

          {/* 1. Description */}
          <div className={cardCls}>
            <SectionTitle>{t("adoption.useCases.descriptionSection", "Description")}</SectionTitle>
            <div className="space-y-3 mt-4">
              <InlineField label={ucLabel} value={currentUC.uc_use_case} />
              <InlineField label={t("adoption.useCases.vendor", "Vendor")} value={currentUC.uc_vendor_name} />
              <InlineField label={t("adoption.useCases.architecture", "Architecture")} value={currentUC.uc_architecture} />
              <InlineField label={t("adoption.useCases.primaryProduct", "Primary Product")} value={currentUC.uc_primary_product_name} />
              <InlineField label={t("common.description", "Description")} value={currentUC.uc_description} multiline rows={4} />
            </div>
          </div>

          {/* 2. Applicability */}
          <div className={cardCls}>
            <SectionTitle>{t("adoption.useCases.applicabilitySection", "Applicability")}</SectionTitle>
            <p className="text-xs text-center font-semibold text-blue-600 dark:text-blue-400 underline mt-1 mb-3">
              {currentUC.uc_use_case}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadonlyField
                label={t("adoption.useCases.keyProducts", "Key Supporting Products")}
                value={currentUC.uc_key_supporting_products} multiline rows={4}
              />
              <ReadonlyField
                label={t("adoption.useCases.keyCapabilities", "Key Capabilities")}
                value={currentUC.uc_key_capabilities} multiline rows={4}
              />
              <ReadonlyField
                label={t("adoption.useCases.itBenefits", "IT Operations Benefits")}
                value={currentUC.uc_it_operations_benefits} multiline rows={4}
              />
              <ReadonlyField
                label={t("adoption.useCases.bizBenefits", "Business Benefits")}
                value={currentUC.uc_business_benefits} multiline rows={4}
              />
              <ReadonlyField
                label={t("adoption.useCases.successMetrics", "Success Metrics")}
                value={currentUC.uc_success_metrics} multiline rows={4}
              />
              <ReadonlyField
                label={t("adoption.useCases.bizOutcomes", "Business Outcomes")}
                value={currentUC.uc_business_outcomes} multiline rows={4}
              />
            </div>
          </div>

          {/* 3. Exit Criteria */}
          <div className={cardCls}>
            <SectionTitle>{t("adoption.useCases.exitCriteriaSection", "Exit Criteria")}</SectionTitle>
            <p className="text-xs text-center font-semibold text-blue-600 dark:text-blue-400 underline mt-1 mb-2">
              {currentUC.uc_use_case}
            </p>
            {currentEC.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-4">
                {t("common.noData", "No data available.")}
              </p>
            ) : (
              <>
                <NavBar
                  index={safeEcIndex}
                  total={currentEC.length}
                  label={stageLabel}
                  onPrev={handleEcPrev}
                  onNext={handleEcNext}
                />
                {currentECRecord && (
                  <div className="space-y-3 mt-3">
                    <InlineField label="Num# / Seq#" value={currentECRecord.ucec_seq !== null ? String(currentECRecord.ucec_seq) : ""} />
                    <InlineField label={t("adoption.useCases.criteriaName", "Name")} value={currentECRecord.ucec_name} />
                    <InlineField label={t("adoption.useCases.taskType", "Task Type")} value={currentECRecord.ucec_tasktype_name} />
                    <InlineField label={t("adoption.useCases.objective", "Objective")} value={currentECRecord.ucec_objective} multiline rows={3} />
                    <InlineField label={t("adoption.useCases.scope", "Scope")} value={currentECRecord.ucec_scope} multiline rows={3} />
                    <InlineField label={t("adoption.useCases.expectedResults", "Expected Results")} value={currentECRecord.ucec_expected_results} multiline rows={3} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* UC Navigation bottom */}
          <div className={cardCls}>
            <NavBar index={safeUcIndex} total={filteredUseCases.length} label={ucLabel} onPrev={handleUcPrev} onNext={handleUcNext} />
          </div>
        </>
      )}
    </div>
  );
}
