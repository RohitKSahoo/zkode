import json
from fastapi import APIRouter, HTTPException
from app.schemas.policy import CompilePolicyRequest, CompiledPolicyResponse
from app.agents.policy_compiler import compile_statutory_policy
from app.core.database import save_compiled_policy

router = APIRouter(tags=["Policy Compiler"])

@router.post("/api/policy/compile", response_model=CompiledPolicyResponse)
def post_compile_policy(req: CompilePolicyRequest):
    """
    Executes the multi-agent LangGraph Statutory Policy Compiler.
    Transforms plain English legal requirements into quantized mathematical constraints
    without recompiling Zero-Knowledge circuits.
    """
    try:
        compiled = compile_statutory_policy(
            prompt=req.prompt,
            service_scope_id=req.service_scope_id
        )

        if not compiled:
            raise HTTPException(status_code=500, detail="Policy compiler failed to synthesize constraints.")

        # Persist compiled policy in SQLite
        save_compiled_policy(
            policy_id=compiled["policy_id"],
            raw_prompt=req.prompt,
            service_scope_id=req.service_scope_id,
            max_birth_timestamp=compiled["maxBirthTimestamp"],
            min_balance_required=int(compiled["minBalanceRequired"]),
            max_income_allowed=int(compiled["maxIncomeAllowed"]),
            min_score_required=int(compiled["minScoreRequired"]),
            symbolic_receipt=json.dumps(compiled["symbolicReceipt"])
        )

        return CompiledPolicyResponse(
            success=True,
            policy_id=compiled["policy_id"],
            serviceScopeId=compiled["serviceScopeId"],
            currentTimestamp=compiled["currentTimestamp"],
            maxBirthTimestamp=compiled["maxBirthTimestamp"],
            minBalanceRequired=compiled["minBalanceRequired"],
            maxIncomeAllowed=compiled["maxIncomeAllowed"],
            minScoreRequired=compiled["minScoreRequired"],
            symbolicReceipt=compiled["symbolicReceipt"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy compilation error: {str(e)}")

@router.get("/api/policy/presets")
def get_policy_presets():
    """
    Returns curated statutory policy presets for 1-click evaluation in the Verifier Portal.
    """
    return {
        "success": True,
        "presets": [
            {
                "id": "merit-scholarship",
                "title": "National Merit & EWS Scholarship",
                "scopeId": "901",
                "prompt": "Applicant must be at least 18 years old, maintain bank balance >= ₹50,000, annual household income <= ₹8,00,000, and academic score >= 8.2 CGPA.",
                "tags": ["Higher Education", "EWS", "Merit"]
            },
            {
                "id": "housing-grant",
                "title": "First-Home Affordable Housing Grant",
                "scopeId": "902",
                "prompt": "Applicant must be at least 21 years old, maintain liquid savings of at least ₹1,00,000, and annual income under ₹6,00,000.",
                "tags": ["Urban Development", "Housing", "Subsidy"]
            },
            {
                "id": "startup-capital",
                "title": "Youth Tech Innovation Grant",
                "scopeId": "903",
                "prompt": "Founder must be at least 18 years old, maintain minimum balance >= ₹25,000, family annual income under ₹12,00,000, and technical score >= 7.5 CGPA.",
                "tags": ["Innovation", "Startups", "Youth"]
            },
            {
                "id": "senior-healthcare",
                "title": "Senior Citizen Medical Stipend",
                "scopeId": "904",
                "prompt": "Citizen must be a senior citizen of at least 60 years old, maintain bank balance >= ₹25,000, and annual income <= ₹4,00,000.",
                "tags": ["Healthcare", "Seniors", "Welfare"]
            }
        ]
    }


