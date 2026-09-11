def sqlite_path_from_url(url: str) -> str:
    """'sqlite:////data/sql_app.db' -> '/data/sql_app.db'."""
    return str(url).replace("sqlite:///", "")
