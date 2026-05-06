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
