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
