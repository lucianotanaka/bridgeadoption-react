#!/usr/bin/env python3

from __future__ import annotations

import argparse
import ast
import importlib.util
import re
import shutil
import sys
from pathlib import Path
from typing import Iterable


DEFAULT_SOURCE_DIR = Path(
    "/opt/bridgeadoption/src/infrastructure/database/repositories"
)

DEFAULT_PROJECT_ROOT = Path("/opt/bridgeadoption")

DEFAULT_REQUIREMENTS_FILE = Path(
    "/opt/bridgeadoption/backend/requirements.txt"
)


# O nome usado no import nem sempre é igual ao nome usado no pip.
IMPORT_TO_PIP = {
    "PIL": "Pillow",
    "bs4": "beautifulsoup4",
    "cv2": "opencv-python",
    "dateutil": "python-dateutil",
    "dotenv": "python-dotenv",
    "fitz": "PyMuPDF",
    "jwt": "PyJWT",
    "magic": "python-magic",
    "psycopg2": "psycopg2-binary",
    "sklearn": "scikit-learn",
    "yaml": "PyYAML",
    "Crypto": "pycryptodome",
}


def normalize_package_name(name: str) -> str:
    """
    Normaliza nomes conforme a convenção usada pelo pip:
    hífen, underscore e ponto são considerados equivalentes.
    """
    return re.sub(r"[-_.]+", "-", name).lower().strip()


def get_standard_library_modules() -> set[str]:
    """
    Retorna os módulos pertencentes à biblioteca padrão do Python.
    """
    stdlib_names = getattr(sys, "stdlib_module_names", None)

    if stdlib_names is not None:
        return set(stdlib_names)

    # Fallback para versões antigas do Python.
    return {
        "abc",
        "argparse",
        "ast",
        "asyncio",
        "base64",
        "collections",
        "contextlib",
        "csv",
        "datetime",
        "decimal",
        "email",
        "enum",
        "functools",
        "hashlib",
        "html",
        "http",
        "importlib",
        "inspect",
        "io",
        "itertools",
        "json",
        "logging",
        "math",
        "os",
        "pathlib",
        "pickle",
        "re",
        "shutil",
        "socket",
        "sqlite3",
        "statistics",
        "string",
        "subprocess",
        "sys",
        "tempfile",
        "threading",
        "time",
        "traceback",
        "types",
        "typing",
        "unittest",
        "urllib",
        "uuid",
        "warnings",
        "xml",
        "zipfile",
    }


def iter_python_files(source_dir: Path) -> Iterable[Path]:
    """
    Percorre recursivamente todos os arquivos Python da pasta.
    """
    yield from sorted(source_dir.rglob("*.py"))


def extract_imports_from_file(file_path: Path) -> set[str]:
    """
    Extrai os módulos raiz utilizados em imports.

    Exemplos:
        import pandas as pd
            -> pandas

        from sqlalchemy.orm import Session
            -> sqlalchemy

        from src.domain.models import User
            -> src
    """
    imports: set[str] = set()

    try:
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_path))
    except UnicodeDecodeError:
        source = file_path.read_text(
            encoding="latin-1",
            errors="replace",
        )
        tree = ast.parse(source, filename=str(file_path))
    except SyntaxError as exc:
        print(
            f"[AVISO] Não foi possível analisar {file_path}: "
            f"erro de sintaxe na linha {exc.lineno}: {exc.msg}"
        )
        return imports
    except OSError as exc:
        print(f"[AVISO] Não foi possível ler {file_path}: {exc}")
        return imports

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".", maxsplit=1)[0]
                imports.add(root_module)

        elif isinstance(node, ast.ImportFrom):
            # level > 0 representa import relativo:
            # from .base_repository import BaseRepository
            if node.level and node.level > 0:
                continue

            if node.module:
                root_module = node.module.split(".", maxsplit=1)[0]
                imports.add(root_module)

    return imports


def collect_imports(source_dir: Path) -> tuple[set[str], dict[str, set[Path]]]:
    """
    Coleta os imports e também registra em quais arquivos aparecem.
    """
    all_imports: set[str] = set()
    import_locations: dict[str, set[Path]] = {}

    for file_path in iter_python_files(source_dir):
        file_imports = extract_imports_from_file(file_path)

        for module_name in file_imports:
            all_imports.add(module_name)
            import_locations.setdefault(module_name, set()).add(file_path)

    return all_imports, import_locations


def is_local_module(module_name: str, project_root: Path) -> bool:
    """
    Verifica se o módulo pertence ao próprio projeto.
    """
    module_file = project_root / f"{module_name}.py"
    module_directory = project_root / module_name

    if module_file.is_file():
        return True

    if module_directory.is_dir():
        return True

    # Alguns projetos adicionam /src diretamente ao PYTHONPATH.
    src_module_file = project_root / "src" / f"{module_name}.py"
    src_module_directory = project_root / "src" / module_name

    return src_module_file.is_file() or src_module_directory.is_dir()


def is_module_available(module_name: str) -> bool:
    """
    Verifica se o módulo pode ser localizado no Python que está
    executando este utilitário.

    Portanto, execute o script com o Python do venv correto.
    """
    try:
        return importlib.util.find_spec(module_name) is not None
    except (ImportError, ModuleNotFoundError, ValueError, AttributeError):
        return False


def extract_requirement_name(line: str) -> str | None:
    """
    Obtém o nome do pacote de uma linha do requirements.txt sem
    modificar o conteúdo original.

    Reconhece, por exemplo:
        pandas==2.2.3
        sqlalchemy>=2.0
        openpyxl
        package[extra]==1.0
    """
    stripped = line.strip()

    if not stripped or stripped.startswith("#"):
        return None

    if stripped.startswith(("-", "git+", "http://", "https://")):
        return None

    # Remove comentário colocado ao final da linha.
    stripped = re.split(r"\s+#", stripped, maxsplit=1)[0].strip()

    # Remove environment marker.
    stripped = stripped.split(";", maxsplit=1)[0].strip()

    match = re.match(r"^([A-Za-z0-9_.-]+)", stripped)

    if not match:
        return None

    return match.group(1)


def read_existing_requirements(
    requirements_file: Path,
) -> tuple[str, set[str]]:
    """
    Lê o conteúdo sem alterá-lo e obtém os nomes dos pacotes existentes.
    """
    if not requirements_file.exists():
        return "", set()

    content = requirements_file.read_text(
        encoding="utf-8",
        errors="replace",
    )

    package_names: set[str] = set()

    for line in content.splitlines():
        package_name = extract_requirement_name(line)

        if package_name:
            package_names.add(normalize_package_name(package_name))

    return content, package_names


def module_to_pip_package(module_name: str) -> str:
    """
    Converte o nome utilizado no import para o provável pacote do pip.
    """
    return IMPORT_TO_PIP.get(module_name, module_name)


def append_requirements(
    requirements_file: Path,
    packages: list[str],
) -> Path | None:
    """
    Acrescenta pacotes ao final do requirements.txt.

    Nenhuma linha existente é removida ou reescrita.
    """
    if not packages:
        return None

    requirements_file.parent.mkdir(parents=True, exist_ok=True)

    backup_file: Path | None = None

    if requirements_file.exists():
        backup_file = requirements_file.with_suffix(
            requirements_file.suffix + ".bak"
        )
        shutil.copy2(requirements_file, backup_file)

        existing_content = requirements_file.read_text(
            encoding="utf-8",
            errors="replace",
        )
    else:
        existing_content = ""

    with requirements_file.open("a", encoding="utf-8") as file:
        # Garante que o novo bloco comece em uma nova linha.
        if existing_content and not existing_content.endswith("\n"):
            file.write("\n")

        file.write("\n")
        file.write(
            "# Dependencias detectadas automaticamente "
            "nos repositories\n"
        )

        for package in packages:
            file.write(f"{package}\n")

    return backup_file


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verifica dependencias importadas pelos repositories "
            "e opcionalmente adiciona pacotes ausentes ao requirements.txt."
        )
    )

    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help="Pasta que contém os arquivos Python.",
    )

    parser.add_argument(
        "--project-root",
        type=Path,
        default=DEFAULT_PROJECT_ROOT,
        help="Diretório raiz do projeto.",
    )

    parser.add_argument(
        "--requirements",
        type=Path,
        default=DEFAULT_REQUIREMENTS_FILE,
        help="Arquivo requirements.txt.",
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Adiciona ao requirements.txt os pacotes ausentes. "
            "Sem esta opção, apenas exibe o relatório."
        ),
    )

    args = parser.parse_args()

    source_dir = args.source.resolve()
    project_root = args.project_root.resolve()
    requirements_file = args.requirements.resolve()

    if not source_dir.is_dir():
        print(f"[ERRO] Pasta não encontrada: {source_dir}")
        return 1

    print("=" * 78)
    print("VERIFICAÇÃO DE DEPENDÊNCIAS DOS REPOSITORIES")
    print("=" * 78)
    print(f"Python.............: {sys.executable}")
    print(f"Versão Python......: {sys.version.split()[0]}")
    print(f"Pasta analisada....: {source_dir}")
    print(f"Raiz do projeto....: {project_root}")
    print(f"Requirements.......: {requirements_file}")
    print()

    python_files = list(iter_python_files(source_dir))

    print(f"Arquivos Python encontrados: {len(python_files)}")

    all_imports, import_locations = collect_imports(source_dir)
    stdlib_modules = get_standard_library_modules()

    external_modules: set[str] = set()
    internal_modules: set[str] = set()
    standard_modules: set[str] = set()

    for module_name in all_imports:
        if module_name in stdlib_modules:
            standard_modules.add(module_name)
        elif is_local_module(module_name, project_root):
            internal_modules.add(module_name)
        else:
            external_modules.add(module_name)

    _, existing_requirement_names = read_existing_requirements(
        requirements_file
    )

    installed_modules: list[str] = []
    missing_modules: list[str] = []
    packages_to_append: list[str] = []

    for module_name in sorted(external_modules, key=str.lower):
        pip_package = module_to_pip_package(module_name)

        if is_module_available(module_name):
            installed_modules.append(module_name)
            status = "INSTALADO"
        else:
            missing_modules.append(module_name)
            status = "AUSENTE"

            normalized_pip_name = normalize_package_name(pip_package)

            if normalized_pip_name not in existing_requirement_names:
                packages_to_append.append(pip_package)

        files = sorted(import_locations.get(module_name, []))
        relative_files = []

        for file_path in files:
            try:
                relative_files.append(
                    str(file_path.relative_to(source_dir))
                )
            except ValueError:
                relative_files.append(str(file_path))

        locations_text = ", ".join(relative_files)

        print(
            f"[{status:9}] "
            f"import={module_name:<25} "
            f"pip={pip_package:<25} "
            f"arquivos={locations_text}"
        )

    # Elimina possíveis duplicações mantendo ordem alfabética.
    packages_to_append = sorted(
        set(packages_to_append),
        key=str.lower,
    )

    print()
    print("-" * 78)
    print(f"Módulos encontrados.............: {len(all_imports)}")
    print(f"Módulos da biblioteca padrão....: {len(standard_modules)}")
    print(f"Módulos internos do projeto.....: {len(internal_modules)}")
    print(f"Pacotes externos instalados.....: {len(installed_modules)}")
    print(f"Pacotes externos ausentes.......: {len(missing_modules)}")
    print(
        "Novas linhas para requirements..: "
        f"{len(packages_to_append)}"
    )

    if missing_modules:
        print()
        print("MÓDULOS AUSENTES NO VENV:")

        for module_name in missing_modules:
            pip_package = module_to_pip_package(module_name)
            already_listed = (
                normalize_package_name(pip_package)
                in existing_requirement_names
            )

            suffix = (
                " — já consta no requirements.txt"
                if already_listed
                else ""
            )

            print(f"  - {module_name} -> {pip_package}{suffix}")

    if packages_to_append:
        print()
        print("PACOTES QUE SERÃO ACRESCENTADOS:")

        for package in packages_to_append:
            print(f"  + {package}")

    if args.apply:
        if packages_to_append:
            backup_file = append_requirements(
                requirements_file=requirements_file,
                packages=packages_to_append,
            )

            print()
            print(
                f"[OK] {len(packages_to_append)} pacote(s) "
                f"acrescentado(s) a:"
            )
            print(f"     {requirements_file}")

            if backup_file:
                print(f"[OK] Backup criado em: {backup_file}")

            print()
            print(
                "Nenhuma linha existente do requirements.txt "
                "foi removida."
            )
        else:
            print()
            print(
                "[OK] Nenhuma nova dependência precisa ser "
                "adicionada ao requirements.txt."
            )
    else:
        print()
        print(
            "Modo de consulta: o requirements.txt não foi alterado."
        )
        print(
            "Para acrescentar os pacotes ausentes, execute novamente "
            "com --apply."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

