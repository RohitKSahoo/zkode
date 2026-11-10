from fastapi import APIRouter, HTTPException
from app.schemas.credential import MintCredentialRequest, MintCredentialResponse
from app.core.crypto import mint_babyjubjub_credential

router = APIRouter(tags=["Mock Issuer"])

@router.post("/api/crypto/mint", response_model=MintCredentialResponse)
def post_mint_credential(req: MintCredentialRequest):
    """
    Mock Identity / Bank Issuer Minting Endpoint.
    Produces BabyJubJub EdDSA signatures over Poseidon composite credentials.
    Enables realistic client-side private witness generation for hackathon demos.
    """
    try:
        minted = mint_babyjubjub_credential(
            user_secret_id=req.userSecretId,
            birth_timestamp=req.birthTimestamp,
            actual_balance=req.actualBalance,
            actual_income=req.actualIncome,
            credit_or_cgpa_score=req.creditOrCgpaScore,
            expiration_timestamp=req.expirationTimestamp
        )

        return MintCredentialResponse(
            success=True,
            issuerPubKey=minted["issuerPubKey"],
            credential=minted["credential"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mint credential: {str(e)}")
