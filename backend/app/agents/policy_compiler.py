import datetime
import re
import os
from typing import Dict, Any
from app.schemas.policy import QuantizedPolicySchema, QUANTIZATION_BUCKET
from app.core.config import GROQ_API_KEY

def _fallback_regex_compiler(text: str, scope_id: str) -> QuantizedPolicySchema:
    """Deterministic regex extraction fallback if LLM offline or unconfigured."""
    text_lower = text.lower()
    
    # Extract age (e.g., "18 years", ">= 18", "age >= 21")
    age_match = re.search(r"(?:age|at least|>=)\s*(\d{1,2})", text_lower)
    min_age = int(age_match.group(1)) if age_match else 18
    
    # Extract balance (e.g., "balance >= ₹50,000", "50k", "50000")
    bal_match = re.search(r"(?:balance|savings|assets?)[^\d]*(\d+[\d,]*)(?:k)?", text_lower)
    min_balance = 50000
    if bal_match:
        val_str = bal_match.group(1).replace(",", "")
        min_balance = int(val_str)
        if "k" in text_lower[bal_match.end()-1:bal_match.end()+2]:
            min_balance *= 1000

    # Extract income (e.g., "income <= 8,00,000", "800000", "8l")
    inc_match = re.search(r"(?:income|earnings?)[^\d]*(\d+[\d,]*)", text_lower)
    max_income = 800000
    if inc_match:
        val_str = inc_match.group(1).replace(",", "")
        max_income = int(val_str)

    # Extract CGPA / score (e.g., "8.2 cgpa", "820")
    score_match = re.search(r"(?:cgpa|score|gpa)[^\d]*(\d+\.?\d*)", text_lower)
    min_score = 0
    if score_match:
        val = float(score_match.group(1))
        min_score = int(val * 100) if val <= 10.0 else int(val)

    return QuantizedPolicySchema(
        min_age=min_age,
        min_balance=min_balance,
        max_income=max_income,
        min_cgpa_x100=min_score,
        service_scope_id=str(scope_id)
    )

def compile_policy(prompt_input: str, scope_id: str = "901") -> Dict[str, Any]:
    res: QuantizedPolicySchema
    if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_groq import ChatGroq
            
            llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.0)
            template = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a deterministic statutory policy compiler. "
                    "Extract numeric eligibility thresholds: min_age, min_balance, max_income, min_cgpa_x100. "
                    "Leave missing criteria at safe defaults."
                )),
                ("human", "{text}")
            ])
            structured_agent = template | llm.with_structured_output(QuantizedPolicySchema)
            res = structured_agent.invoke({"text": prompt_input})
            res.service_scope_id = str(scope_id)
        except Exception:
            res = _fallback_regex_compiler(prompt_input, scope_id)
    else:
        res = _fallback_regex_compiler(prompt_input, scope_id)

    today = datetime.date.today()
    cutoff_year = today.year - res.min_age
    max_birth = int(f"{cutoff_year}{today.month:02d}{today.day:02d}")
    current_ts = int(f"{today.year}{today.month:02d}{today.day:02d}")

    return {
        "policy_id": f"pol_{scope_id}_{current_ts}",
        "serviceScopeId": str(res.service_scope_id),
        "currentTimestamp": str(current_ts),
        "maxBirthTimestamp": str(max_birth),
        "minBalanceRequired": str(res.min_balance),
        "maxIncomeAllowed": str(res.max_income),
        "minScoreRequired": str(res.min_cgpa_x100),
        "symbolicReceipt": [
            f"Statutory Age: >= {res.min_age} years (Born on or before {cutoff_year}-{today.month:02d}-{today.day:02d})",
            f"Asset Minimum: >= ₹{res.min_balance:,} (Quantized step ₹{QUANTIZATION_BUCKET:,})",
            f"Income Ceiling: <= ₹{res.max_income:,} (Quantized step ₹{QUANTIZATION_BUCKET:,})",
            f"Merit Threshold: >= {res.min_cgpa_x100 / 100:.2f} CGPA (Score: {res.min_cgpa_x100})"
        ]
    }

