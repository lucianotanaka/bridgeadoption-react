import sys

sys.path.insert(0, "backend")

from app.auth.service import login_user


def main():
    result = login_user("luciano.tanaka@global.ntt", "nttbsp")
    print(result)


if __name__ == "__main__":
    main()
