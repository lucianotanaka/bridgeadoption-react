from src.infrastructure.database.repositories.company_list_name_repository import (
    CompanyListNameRepository,
)


def testar_get_company_id_by_name(company_name: str) -> None:
    """
    Executa um teste simples da função
    CompanyListNameRepository.get_company_id_by_name.
    """
    repo = CompanyListNameRepository()

    print(f"Buscando company_id para o nome: {company_name!r} ...")
    company_id = repo.get_company_id_by_name(company_name)

    if company_id is None:
        print("Nenhum registro encontrado (retornou None).")
    else:
        print(f"Encontrado company_id = {company_id}")


if __name__ == "__main__":
    import sys

    # Agora é OBRIGATÓRIO informar o nome da empresa.
    # Uso:
    #   python -m src.app.teste_buscar_empresa "NOME DA EMPRESA"
    if len(sys.argv) < 2:
        print(
            "Uso: python -m src.app.teste_buscar_empresa \"NOME DA EMPRESA\""
        )
        sys.exit(1)

    nome_empresa = " ".join(sys.argv[1:])
    testar_get_company_id_by_name(nome_empresa)
