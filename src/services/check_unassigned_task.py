"""
PURPOSE...: Alocar um CSM para tarefas abertas no BA sem dono (owner_id = 0)
RULES.....:
  - Certos tipos de tarefa tem atribuicao fixa a um owner especifico
  - Certos owners so podem receber determinados tipos de tarefa
  - Certos owners nunca recebem tarefas (bloqueados)

CREATED BY: Luciano Tanaka
VERSION...: 4.0 (2026)

CONFIGURACAO (editar conforme necessidade):
  FIXED_TYPE_ASSIGNMENTS   -- dict task_type_id -> owner_id
                              tipos com dono fixo obrigatorio
  OWNER_TYPE_RESTRICTIONS  -- dict owner_id -> set de task_type_ids permitidos
                              owners sem entrada aqui nao tem restricao de tipo
  BLOCKED_OWNER_IDS        -- set de owner_ids que nunca recebem tarefas

PUBLICO:
  run()
      Processa em loop todas as tarefas sem dono da view vwTaskNoCSMListCustomer
      e persiste a alocacao no banco. Uso: cron job.

  resolve_csm(type_id, csm_id=0, am_id=0, customer_id=0) -> int
      Aplica as mesmas regras de prioridade e retorna apenas o csm_id indicado,
      sem gravar nada no banco. Uso: importadores que precisam saber qual CSM
      atribuir antes de inserir/atualizar uma tarefa.
"""

import logging
from src.infrastructure.database.connection import get_db_connection

# ---------------------------------------------------------
# Configuracao de regras de negocio
# (editar aqui para adicionar/remover restricoes)
# ---------------------------------------------------------

# task_type_id -> owner_id
# Tipos de tarefa que SEMPRE vao para um owner especifico (regra fixa).
# Exemplo: tipo 22 sempre vai para o owner 93.
# Para adicionar: incluir nova entrada, ex.: 25: 97
FIXED_TYPE_ASSIGNMENTS: dict = {
    22: 93,
}

# owner_id -> conjunto de task_type_ids que esse owner pode receber.
# Owners que NAO estiverem neste dict nao tem restricao de tipo.
# Exemplo: owner 93 so pode receber tipo 22.
# Para adicionar: incluir nova entrada, ex.: 97: {25, 30}
OWNER_TYPE_RESTRICTIONS: dict = {
    93: {22},
}

# Conjunto de owner_ids que NUNCA recebem tarefas (bloqueados).
# Exemplo: owner 6 esta bloqueado.
# Para adicionar: incluir o id no set, ex.: {6, 15}
BLOCKED_OWNER_IDS: set = {6}

# ---------------------------------------------------------

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------

def _run_query(cursor, query: str, params: tuple = None) -> list:
    """Executa uma query e retorna todos os resultados."""
    cursor.execute(query, params or ())
    return cursor.fetchall()


def _update_task_owner(cursor, customer_id: int, owner_id: int, type_id: int) -> None:
    """Atualiza task_owner_id das tarefas abertas de um cliente/tipo sem dono."""
    query = """
        UPDATE tbTask
           SET task_owner_id = %s
         WHERE task_customer_id = %s
           AND task_owner_id = 0
           AND task_status = 1
           AND task_tasktype_id = %s
    """
    cursor.execute(query, (owner_id, customer_id, type_id))


def _is_owner_allowed(owner_id: int, type_id: int) -> bool:
    """
    Valida se um owner pode receber uma tarefa do tipo informado.

    Regras (derivadas da configuracao no topo do modulo):
      - owner_id invalido (0 ou None)                        -> False
      - owner em BLOCKED_OWNER_IDS                           -> False
      - owner em OWNER_TYPE_RESTRICTIONS e type_id fora
        do conjunto permitido                                -> False
    """
    if not owner_id or owner_id == 0:
        return False
    if owner_id in BLOCKED_OWNER_IDS:
        return False
    if owner_id in OWNER_TYPE_RESTRICTIONS:
        if type_id not in OWNER_TYPE_RESTRICTIONS[owner_id]:
            return False
    return True


def _get_account_team_for_customer(cursor, customer_id: int) -> tuple:
    """
    Busca o AM e o CSM ativos vinculados a um cliente em tbAccountTeam.
    Retorna (am_id, csm_id). Valores nao encontrados retornam 0.
    """
    query = """
        SELECT accountteam_user_id, accountteam_user_type
          FROM tbAccountTeam
         WHERE accountteam_company_id = %s
           AND accountteam_allocated <> 0
           AND accountteam_user_type IN ('AM', 'CSM')
         ORDER BY accountteam_id DESC
    """
    rows = _run_query(cursor, query, (customer_id,))

    am_id  = 0
    csm_id = 0

    for row in rows:
        user_id   = int(row[0]) if row[0] else 0
        user_type = str(row[1]).upper() if row[1] else ""

        if user_type == "AM"  and am_id  == 0:
            am_id  = user_id
        if user_type == "CSM" and csm_id == 0:
            csm_id = user_id
        if am_id != 0 and csm_id != 0:
            break

    return am_id, csm_id


def _get_frequent_csm_per_customer(cursor, customer_id: int, type_id: int) -> int:
    """
    Busca o CSM que mais atendeu um cliente especifico com base no historico
    de tarefas em tbTask (contagem de task_id por task_owner_id).

    Aplica as mesmas regras de exclusao (BLOCKED_OWNER_IDS e
    OWNER_TYPE_RESTRICTIONS) para garantir elegibilidade.

    Retorna o csm_id ou 0 se nenhum elegivel for encontrado.
    """
    excluded = set(BLOCKED_OWNER_IDS)
    for owner_id, allowed_types in OWNER_TYPE_RESTRICTIONS.items():
        if type_id not in allowed_types:
            excluded.add(owner_id)

    params = [customer_id]

    if excluded:
        placeholders = ", ".join(["%s"] * len(excluded))
        where_excluded = "AND task_owner_id NOT IN ({})".format(placeholders)
        params += list(excluded)
    else:
        where_excluded = ""

    # Retorna ate 10 candidatos para validacao extra via _is_owner_allowed
    query = """
        SELECT task_owner_id
          FROM tbTask
         WHERE task_customer_id = %s
           AND task_owner_id <> 0
           {}
         GROUP BY task_owner_id
         ORDER BY COUNT(task_id) DESC, task_owner_id ASC
         LIMIT 10
    """.format(where_excluded)

    rows = _run_query(cursor, query, tuple(params))

    for row in rows:
        csm_id = int(row[0]) if row[0] else 0
        if csm_id and _is_owner_allowed(csm_id, type_id):
            return csm_id

    return 0


def _get_valid_frequent_csm_per_am(cursor, am_id: int, type_id: int) -> int:
    """
    Busca o primeiro CSM valido do ranking de CSMs frequentes por AM
    (view vwAccountTeamFrequentCSMperAM).
    Retorna o csm_id ou 0 se nenhum valido for encontrado.
    """
    query = """
        SELECT csm_id
          FROM vwAccountTeamFrequentCSMperAM
         WHERE am_id = %s
         ORDER BY rank_pos ASC, csm_id ASC
    """
    rows = _run_query(cursor, query, (am_id,))

    for (csm_id,) in rows:
        if csm_id and _is_owner_allowed(int(csm_id), type_id):
            return int(csm_id)

    return 0


def _get_min_load_csm_per_type(cursor, type_id: int) -> int:
    """
    Busca o CSM ativo elegivel com menor carga de tarefas abertas para o tipo
    informado (view vwSquadCSMActive).

    Exclui automaticamente BLOCKED_OWNER_IDS e owners em
    OWNER_TYPE_RESTRICTIONS sem permissao para este type_id.

    Retorna o csm_id ou 0 se nenhum encontrado.
    """
    excluded = set(BLOCKED_OWNER_IDS)
    for owner_id, allowed_types in OWNER_TYPE_RESTRICTIONS.items():
        if type_id not in allowed_types:
            excluded.add(owner_id)

    params = [type_id]

    if excluded:
        placeholders = ", ".join(["%s"] * len(excluded))
        where_clause = "WHERE s.csm_id NOT IN ({})".format(placeholders)
        params += list(excluded)
    else:
        where_clause = ""

    query = """
        SELECT s.csm_id
          FROM vwSquadCSMActive s
          LEFT JOIN tbTask t
            ON t.task_owner_id = s.csm_id
           AND t.task_tasktype_id = %s
           AND t.task_status NOT IN (4, 5, 6, 10)
         {}
         GROUP BY s.csm_id, s.csm_name
         ORDER BY COUNT(t.task_id) ASC, s.csm_id ASC
         LIMIT 1
    """.format(where_clause)

    rows = _run_query(cursor, query, tuple(params))

    if rows and rows[0][0]:
        return int(rows[0][0])

    return 0


# ---------------------------------------------------------
# API publica -- consulta sem efeito colateral
# ---------------------------------------------------------

def resolve_csm(
    type_id: int,
    csm_id: int = 0,
    am_id: int = 0,
    customer_id: int = 0,
) -> int:
    """
    Resolve e retorna o csm_id mais adequado para uma tarefa, aplicando as
    mesmas regras de prioridade do loop de alocacao, mas sem gravar nada
    no banco.

    Ideal para importadores que precisam determinar o dono de uma nova tarefa
    antes de inseri-la.

    Prioridade:
      0. Regra fixa  : type_id em FIXED_TYPE_ASSIGNMENTS -> owner mapeado
      1. CSM da conta: registrado em tbAccountTeam, se permitido
      2. Frequencia  : CSM que mais atendeu este cliente (historico tbTask)
      3. AM ranking  : CSM mais frequente para o AM da conta
      4. Menor carga : CSM ativo com menor numero de tarefas abertas do tipo

    Parametros:
      type_id     : ID do tipo da tarefa (obrigatorio)
      csm_id      : CSM ja vinculado a conta, se disponivel (default 0)
      am_id       : AM responsavel pela conta, se disponivel (default 0)
      customer_id : ID do cliente. Quando informado e csm_id/am_id forem 0,
                    o sistema consulta tbAccountTeam para obter o AM e CSM
                    automaticamente antes de aplicar as regras. Tambem usado
                    para buscar o CSM com maior frequencia de atendimento
                    ao cliente no historico de tbTask.

    Retorna:
      csm_id resolvido, ou 0 se nenhum elegivel for encontrado.

    Exemplos:
      # Apenas o tipo -- fallback para menor carga (ou regra fixa)
      owner = resolve_csm(type_id=10)

      # Com customer_id -- busca account team e frequencia automaticamente
      owner = resolve_csm(type_id=10, customer_id=500)

      # Passando explicitamente AM e CSM (sem consulta extra ao banco)
      owner = resolve_csm(type_id=10, csm_id=42, am_id=7)
    """
    type_id     = int(type_id)     if type_id     else 0
    csm_id      = int(csm_id)      if csm_id      else 0
    am_id       = int(am_id)       if am_id       else 0
    customer_id = int(customer_id) if customer_id else 0

    # Opcao 0: regra fixa por tipo (sem conexao ao banco)
    if type_id in FIXED_TYPE_ASSIGNMENTS:
        fixed_owner = FIXED_TYPE_ASSIGNMENTS[type_id]
        logger.debug(f"resolve_csm tipo={type_id} -> {fixed_owner} (regra fixa)")
        return fixed_owner

    connection = get_db_connection()
    cursor = None

    try:
        cursor = connection.cursor()

        # Auto-lookup: buscar AM e CSM da conta quando customer_id e informado
        # e os valores nao foram passados explicitamente
        if customer_id != 0 and (csm_id == 0 or am_id == 0):
            db_am_id, db_csm_id = _get_account_team_for_customer(cursor, customer_id)
            if am_id  == 0:
                am_id  = db_am_id
            if csm_id == 0:
                csm_id = db_csm_id
            logger.debug(
                f"resolve_csm customer={customer_id}: "
                f"account team -> am={am_id} csm={csm_id}"
            )

        # Opcao 1: CSM registrado na conta (tbAccountTeam), se valido
        if csm_id != 0 and _is_owner_allowed(csm_id, type_id):
            logger.debug(f"resolve_csm tipo={type_id} -> {csm_id} (CSM da conta)")
            return csm_id

        # Opcao 2: CSM que mais atendeu este cliente (historico em tbTask)
        if customer_id != 0:
            owner_id = _get_frequent_csm_per_customer(cursor, customer_id, type_id)
            if owner_id != 0:
                logger.debug(
                    f"resolve_csm tipo={type_id} -> {owner_id} "
                    f"(mais frequente no cliente {customer_id})"
                )
                return owner_id

        # Opcao 3: CSM mais frequente para o AM da conta
        if am_id != 0:
            owner_id = _get_valid_frequent_csm_per_am(cursor, am_id, type_id)
            if owner_id != 0:
                logger.debug(
                    f"resolve_csm tipo={type_id} -> {owner_id} (ranking AM {am_id})"
                )
                return owner_id

        # Opcao 4: CSM ativo com menor carga para o tipo (fallback global)
        owner_id = _get_min_load_csm_per_type(cursor, type_id)
        if owner_id != 0:
            logger.debug(f"resolve_csm tipo={type_id} -> {owner_id} (menor carga)")
            return owner_id

        logger.warning(f"resolve_csm tipo={type_id}: nenhum CSM elegivel encontrado")
        return 0

    except Exception as e:
        logger.error(f"erro_resolve_csm: {e}")
        raise

    finally:
        try:
            if cursor:
                cursor.close()
            connection.close()
        except Exception:
            pass


# ---------------------------------------------------------
# Funcao principal -- alocacao em lote (cron)
# ---------------------------------------------------------

def run() -> int:
    """
    Aloca um CSM para todas as tarefas abertas sem dono (owner_id = 0).

    Pode ser chamado diretamente como cron job (via __main__) ou importado
    e invocado por importadores para garantir que novas tarefas sejam alocadas.

    Retorna o numero total de alocacoes realizadas.
    """
    assigned_count = 0
    connection = get_db_connection()
    cursor = None

    try:
        cursor = connection.cursor()

        while True:

            rows = _run_query(cursor, "SELECT COUNT(*) FROM vwTaskNoCSMListCustomer")
            total = rows[0][0] if rows else 0

            if not total or total == 0:
                logger.info("Nenhuma tarefa sem CSM encontrada. Encerrando.")
                break

            query_task = """
                SELECT task_type_id, task_customer_id, accountteam_am_id, accountteam_csm_id
                  FROM vwTaskNoCSMListCustomer
                 LIMIT 1
            """
            task_rows = _run_query(cursor, query_task)

            if not task_rows:
                logger.warning("Nenhum registro retornado pela view.")
                break

            task_type_id, customer_id, am_id, csm_id = task_rows[0]

            task_type_id = int(task_type_id) if task_type_id else 0
            customer_id  = int(customer_id)  if customer_id  else 0
            am_id        = int(am_id)         if am_id        else 0
            csm_id       = int(csm_id)        if csm_id       else 0

            # Regra fixa
            if task_type_id in FIXED_TYPE_ASSIGNMENTS:
                fixed_owner = FIXED_TYPE_ASSIGNMENTS[task_type_id]
                _update_task_owner(cursor, customer_id, fixed_owner, task_type_id)
                connection.commit()
                assigned_count += 1
                logger.info(
                    f"Cliente {customer_id} / tipo {task_type_id} "
                    f"-> owner {fixed_owner} (regra fixa)"
                )
                continue

            assigned = False

            # Opcao 1: CSM registrado na conta (tbAccountTeam)
            if csm_id != 0:
                if _is_owner_allowed(csm_id, task_type_id):
                    _update_task_owner(cursor, customer_id, csm_id, task_type_id)
                    connection.commit()
                    assigned_count += 1
                    assigned = True
                    logger.info(
                        f"Cliente {customer_id} / tipo {task_type_id} "
                        f"-> owner {csm_id} (CSM da conta)"
                    )
                else:
                    logger.info(
                        f"Cliente {customer_id} / tipo {task_type_id}: "
                        f"CSM da conta {csm_id} rejeitado"
                    )

            if assigned:
                continue

            # Opcao 2: CSM que mais atendeu este cliente (historico tbTask)
            owner_id = _get_frequent_csm_per_customer(cursor, customer_id, task_type_id)

            if owner_id != 0:
                _update_task_owner(cursor, customer_id, owner_id, task_type_id)
                connection.commit()
                assigned_count += 1
                assigned = True
                logger.info(
                    f"Cliente {customer_id} / tipo {task_type_id} "
                    f"-> owner {owner_id} (mais frequente no cliente)"
                )

            if assigned:
                continue

            # Opcao 3: CSM mais frequente para o AM da conta
            if am_id != 0:
                owner_id = _get_valid_frequent_csm_per_am(cursor, am_id, task_type_id)

                if owner_id != 0:
                    _update_task_owner(cursor, customer_id, owner_id, task_type_id)
                    connection.commit()
                    assigned_count += 1
                    assigned = True
                    logger.info(
                        f"Cliente {customer_id} / tipo {task_type_id} "
                        f"-> owner {owner_id} (ranking por AM {am_id})"
                    )
                else:
                    logger.info(
                        f"Cliente {customer_id} / tipo {task_type_id}: "
                        f"nenhum CSM valido encontrado no ranking do AM {am_id}"
                    )

            if assigned:
                continue

            # Opcao 4: CSM ativo com menor carga do tipo (fallback global)
            owner_id = _get_min_load_csm_per_type(cursor, task_type_id)

            if owner_id != 0:
                _update_task_owner(cursor, customer_id, owner_id, task_type_id)
                connection.commit()
                assigned_count += 1
                assigned = True
                logger.info(
                    f"Cliente {customer_id} / tipo {task_type_id} "
                    f"-> owner {owner_id} (menor carga do tipo)"
                )

            if assigned:
                continue

            logger.warning(
                f"Nenhum CSM valido encontrado para customer_id={customer_id}, "
                f"task_type_id={task_type_id}. Encerrando para evitar loop infinito."
            )
            break

    except Exception as e:
        logger.error(f"erro_check_unassigned_task: {e}")
        connection.rollback()
        raise

    finally:
        try:
            if cursor:
                cursor.close()
            connection.close()
        except Exception:
            pass

    logger.info(f"Total de tarefas alocadas: {assigned_count}")
    return assigned_count


# ---------------------------------------------------------
# Execucao direta (cron job)
# ---------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    run()
