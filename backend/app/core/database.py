import sqlite3
import os
from typing import Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "zkode_registry.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS nullifier_registry (
            nullifier_hash TEXT NOT NULL,
            service_scope_id TEXT NOT NULL,
            claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_nonce_used TEXT NOT NULL,
            PRIMARY KEY (nullifier_hash, service_scope_id)
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS challenge_sessions (
            session_id TEXT PRIMARY KEY,
            session_nonce TEXT NOT NULL UNIQUE,
            service_scope_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            is_consumed INTEGER DEFAULT 0
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS compiled_policies (
            policy_id TEXT PRIMARY KEY,
            raw_prompt TEXT NOT NULL,
            service_scope_id TEXT NOT NULL,
            max_birth_timestamp TEXT NOT NULL,
            min_balance_required INTEGER NOT NULL,
            max_income_allowed INTEGER NOT NULL,
            min_score_required INTEGER NOT NULL,
            symbolic_receipt TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

def register_nullifier_atomic(nullifier_hash: str, service_scope_id: str, session_nonce: str = "") -> Tuple[bool, str]:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO nullifier_registry (nullifier_hash, service_scope_id, session_nonce_used) VALUES (?, ?, ?)",
            (nullifier_hash, service_scope_id, session_nonce)
        )
        conn.commit()
        return True, "Nullifier committed successfully."
    except sqlite3.IntegrityError:
        return False, f"Sybil double-dip violation: Nullifier {nullifier_hash} already claimed."
    finally:
        conn.close()

