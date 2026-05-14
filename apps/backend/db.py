import struct
import pyodbc
from azure.identity import ClientSecretCredential
from config import settings

_SQL_COPT_SS_ACCESS_TOKEN = 1256


def get_connection() -> pyodbc.Connection:
    """Open an authenticated pyodbc connection to the Fabric SQL analytics endpoint.

    Requires ODBC Driver 18 for SQL Server to be installed on the host:
    https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
    """
    credential = ClientSecretCredential(
        tenant_id=settings.fabric_tenant_id,
        client_id=settings.fabric_client_id,
        client_secret=settings.fabric_client_secret,
    )
    token = credential.get_token("https://database.windows.net/.default")
    token_bytes = token.token.encode("UTF-16-LE")
    token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)

    conn_str = (
        f"Driver={{ODBC Driver 18 for SQL Server}};"
        f"Server={settings.fabric_sql_endpoint};"
        f"Database={settings.fabric_database};"
        f"Encrypt=yes;TrustServerCertificate=no;"
    )
    return pyodbc.connect(conn_str, attrs_before={_SQL_COPT_SS_ACCESS_TOKEN: token_struct})


def safe_run_sql(query: str) -> list[dict]:
    """Execute a read-only SELECT query and return rows as a list of dicts.

    Raises ValueError for any non-SELECT statement before touching the database.
    All other exceptions (connection failures, SQL errors) propagate to the caller.
    """
    if not query.strip().upper().startswith("SELECT"):
        raise ValueError("Only SELECT statements are permitted.")
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]
    finally:
        conn.close()
