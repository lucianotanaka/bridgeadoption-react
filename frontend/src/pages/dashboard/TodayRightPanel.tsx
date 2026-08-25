import { useTranslation } from "react-i18next";
import { AlertTriangle, Zap, TrendingDown } from "lucide-react";

export interface ImmediateAction { id: number; label: string; description: string; type: "warning" | "danger" | "info"; }
export interface AccountAtRisk { id: number; name: string; reason: string; value?: string; daysLeft?: number; }

interface Props { immediateActions: ImmediateAction[]; accountsAtRisk: AccountAtRisk[]; }

export default function TodayRightPanel({ immediateActions, accountsAtRisk }: Props) {
  const { t } = useTranslation();
  return (
    <div className="w-72 xl:w-80 shrink-0 space-y-4">
      {/* Section heading */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-0">
        {t("today.rightPanel.title")}
      </h2>

      {/* Ações Imediatas — TODO: GET /today/immediate-actions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("today.rightPanel.immediateActions")}</h3>
          </div>
          {immediateActions.length > 0 && (
            <span className="text-[11px] font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">{immediateActions.length}</span>
          )}
        </div>
        {immediateActions.length === 0 ? (
          <p className="px-4 py-5 text-xs text-gray-400 dark:text-gray-500 italic text-center">{t("today.rightPanel.noImmediateActions")}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {immediateActions.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 ${a.type === "danger" ? "text-rose-500" : a.type === "warning" ? "text-amber-500" : "text-blue-400"}`}>
                  <AlertTriangle size={13} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{a.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contas em risco — TODO: GET /today/accounts-at-risk ou /portfolio/farol?filter=at_risk */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-rose-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("today.rightPanel.accountsAtRisk")}</h3>
          </div>
          {accountsAtRisk.length > 0 && (
            <span className="text-[11px] font-bold bg-rose-500 text-white rounded-full px-2 py-0.5">{accountsAtRisk.length}</span>
          )}
        </div>
        {accountsAtRisk.length === 0 ? (
          <p className="px-4 py-5 text-xs text-gray-400 dark:text-gray-500 italic text-center">{t("today.rightPanel.noAccountsAtRisk")}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {accountsAtRisk.map((acct) => (
              <div key={acct.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{acct.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{acct.reason}{acct.daysLeft !== undefined ? ` · ${acct.daysLeft}d` : ""}</p>
                  {acct.value && <p className="text-xs font-semibold text-rose-500 mt-0.5">{acct.value}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
