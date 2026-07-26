def safe_strip(val):
    """
    Remove espaços em branco se o valor for uma string.
    Retorna None se o resultado for uma string vazia ou se o valor original for None.
    Previne contra o erro:
    AttributeError: 'NoneType' object has no attribute 'strip'
    """
    if val is None:
        return None
    if isinstance(val, str):
        cleaned = val.strip()
        return cleaned if cleaned else None
    return val

