import json
import os

keys_by_lang = {
    "en": {
        "portfolioBurndown": "Portfolio Burndown",
        "portfolioBurndownSubtitle": "LCI Wallet - Stage Opt In vs Claim Approved vs Pipeline",
        "timelineFilter": "Timeline Filter",
        "pbOptIn": "Stage Opt In (Period)",
        "pbApproved": "Claim Approved (Period)",
        "pbPipeline": "Pipeline Remaining",
        "pbConversionRate": "Conversion Rate",
        "pbCumulative": "Portfolio Burndown - Cumulative",
        "pbCumulativeSubtitle": "Accumulated Stage Opt In, Claim Approved and Pipeline over the selected timeline",
        "pbMonthly": "Monthly Activity",
        "pbMonthlySubtitle": "New Stage Opt In and Claim Approved per month (non-cumulative)",
        "tooltipPbOptIn": "Sum of task_value of tasks whose LCI stages started within the selected period. Represents the portfolio value committed to the Cisco incentive approval process during the timeline.",
        "tooltipPbApproved": "Sum of stage_amount_usd of stages approved by Cisco (Claim Approved) with approval date within the selected period.",
        "tooltipPbPipeline": "Stage Opt In minus Claim Approved (accumulated). Represents the value still pending approval by Cisco.",
        "tooltipPbConvRate": "Conversion Rate = Claim Approved / Stage Opt In for the selected period.",
        "tooltipPbChart": "Blue area: accumulated Stage Opt In. Green line: accumulated Claim Approved. Orange dotted area: remaining Pipeline.",
        "tooltipPbMonthly": "Monthly non-cumulative view of new Stage Opt In and Claim Approved. Useful to identify when activity peaks occurred.",
        "dataAvailable": "Data available"
    },
    "pt": {
        "portfolioBurndown": "Portfolio Burndown",
        "portfolioBurndownSubtitle": "LCI Wallet - Stage Opt In vs Claim Aprovado vs Pipeline",
        "timelineFilter": "Filtro de Periodo",
        "pbOptIn": "Stage Opt In (Periodo)",
        "pbApproved": "Claim Aprovado (Periodo)",
        "pbPipeline": "Pipeline Restante",
        "pbConversionRate": "Taxa de Conversao",
        "pbCumulative": "Portfolio Burndown - Acumulado",
        "pbCumulativeSubtitle": "Stage Opt In, Claim Aprovado e Pipeline acumulados ao longo do periodo selecionado",
        "pbMonthly": "Atividade Mensal",
        "pbMonthlySubtitle": "Novo Stage Opt In e Claim Aprovado por mes (nao acumulado)",
        "tooltipPbOptIn": "Soma do task_value das tarefas cujos estagios LCI foram iniciados no periodo selecionado. Representa o valor da carteira comprometida com o processo de aprovacao de incentivo da Cisco.",
        "tooltipPbApproved": "Soma do stage_amount_usd dos estagios aprovados pela Cisco (Claim Approved) com data de aprovacao no periodo selecionado.",
        "tooltipPbPipeline": "Stage Opt In menos Claim Aprovado (acumulado). Valor ainda pendente de aprovacao pela Cisco.",
        "tooltipPbConvRate": "Taxa de Conversao = Claim Aprovado / Stage Opt In para o periodo selecionado.",
        "tooltipPbChart": "Area azul: Stage Opt In acumulado. Linha verde: Claim Aprovado. Area laranja: Pipeline restante.",
        "tooltipPbMonthly": "Visao mensal nao acumulada de Stage Opt In e Claim Aprovado.",
        "dataAvailable": "Dados disponiveis"
    },
    "es": {
        "portfolioBurndown": "Portfolio Burndown",
        "portfolioBurndownSubtitle": "LCI Wallet - Stage Opt In vs Claim Aprobado vs Pipeline",
        "timelineFilter": "Filtro de Periodo",
        "pbOptIn": "Stage Opt In (Periodo)",
        "pbApproved": "Claim Aprobado (Periodo)",
        "pbPipeline": "Pipeline Restante",
        "pbConversionRate": "Tasa de Conversion",
        "pbCumulative": "Portfolio Burndown - Acumulado",
        "pbCumulativeSubtitle": "Stage Opt In, Claim Aprobado y Pipeline acumulados a lo largo del periodo seleccionado",
        "pbMonthly": "Actividad Mensual",
        "pbMonthlySubtitle": "Nuevo Stage Opt In y Claim Aprobado por mes (no acumulado)",
        "tooltipPbOptIn": "Suma del task_value de las tareas cuyos etapas LCI se iniciaron en el periodo seleccionado. Representa el valor comprometido con el proceso de aprobacion de incentivos de Cisco.",
        "tooltipPbApproved": "Suma del stage_amount_usd de los etapas aprobados por Cisco (Claim Approved) con fecha de aprobacion en el periodo seleccionado.",
        "tooltipPbPipeline": "Stage Opt In menos Claim Aprobado (acumulado). Valor pendiente de aprobacion.",
        "tooltipPbConvRate": "Tasa de Conversion = Claim Aprobado / Stage Opt In para el periodo seleccionado.",
        "tooltipPbChart": "Area azul: Stage Opt In acumulado. Linea verde: Claim Aprobado. Area naranja: Pipeline restante.",
        "tooltipPbMonthly": "Vista mensual no acumulada de Stage Opt In y Claim Aprobado.",
        "dataAvailable": "Datos disponibles"
    }
}

base = "x:/frontend/src/i18n/locales"
for lang, keys in keys_by_lang.items():
    path = os.path.join(base, lang + ".json")
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)
    d.setdefault("adoption", {}).setdefault("ciscoLci", {}).update(keys)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print("Updated", lang, "- portfolioBurndown:", d["adoption"]["ciscoLci"].get("portfolioBurndown"))
