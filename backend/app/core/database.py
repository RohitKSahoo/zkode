import sqlite3
import os
import time
from typing import Tuple, Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "zkode_registry.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_challenge_nonce 
        ON challenge_sessions (session_nonce);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_nullifier_lookup 
        ON nullifier_registry (nullifier_hash, service_scope_id);
    """)
    conn.commit()
    conn.close()

def register_nullifier_atomic(
    nullifier_hash: str, 
    service_scope_id: str, 
    session_nonce: str = ""
) -> Tuple[bool, str]:
    """Atomically commit a nullifier. If already claimed, raises Sybil rejection."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO nullifier_registry 
               (nullifier_hash, service_scope_id, session_nonce_used) 
               VALUES (?, ?, ?)""",
            (nullifier_hash, service_scope_id, session_nonce)
        )
        conn.commit()
        return True, "Nullifier committed successfully."
    except sqlite3.IntegrityError:
        return False, f"Sybil double-dip violation: Nullifier {nullifier_hash} already claimed."
    finally:
        conn.close()

def create_challenge_session(
    session_id: str,
    session_nonce: str,
    service_scope_id: str,
    expires_at_ms: int
) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        now_ms = int(time.time() * 1000)
        cursor.execute(
            """INSERT INTO challenge_sessions 
               (session_id, session_nonce, service_scope_id, created_at, expires_at, is_consumed)
               VALUES (?, ?, ?, ?, ?, 0)""",
            (session_id, session_nonce, service_scope_id, now_ms, expires_at_ms)
        )
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()

def validate_and_consume_nonce(session_nonce: str) -> Tuple[bool, str]:
    """
    Validates that a challenge nonce exists, is not expired (60s TTL), 
    and has not been consumed. Atomically consumes it to prevent replay attacks.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_ms = int(time.time() * 1000)
    try:
        cursor.execute(
            """SELECT session_id, expires_at, is_consumed 
               FROM challenge_sessions 
               WHERE session_nonce = ?""",
            (session_nonce,)
        )
        row = cursor.fetchone()
        if not row:
            return False, "Replay defense violation: Challenge nonce was never issued or not found."
        
        if row["is_consumed"] == 1:
            return False, "Replay defense violation: Challenge nonce has already been consumed."
        
        if now_ms > row["expires_at"]:
            return False, "Challenge expired: 60-second validity window elapsed."

        cursor.execute(
            "UPDATE challenge_sessions SET is_consumed = 1 WHERE session_nonce = ?",
            (session_nonce,)
        )
        conn.commit()
        return True, "Nonce validated and consumed."
    finally:
        conn.close()

def save_compiled_policy(
    policy_id: str,
    raw_prompt: str,
    service_scope_id: str,
    max_birth_timestamp: str,
    min_balance_required: int,
    max_income_allowed: int,
    min_score_required: int,
    symbolic_receipt: str
) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT OR REPLACE INTO compiled_policies
               (policy_id, raw_prompt, service_scope_id, max_birth_timestamp, 
                min_balance_required, max_income_allowed, min_score_required, symbolic_receipt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (policy_id, raw_prompt, service_scope_id, max_birth_timestamp,
             min_balance_required, max_income_allowed, min_score_required, symbolic_receipt)
        )
        conn.commit()
        return True
    finally:
        conn.close()

def get_latest_policy_for_scope(service_scope_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT * FROM compiled_policies 
               WHERE service_scope_id = ? 
               ORDER BY created_at DESC LIMIT 1""",
            (service_scope_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()
