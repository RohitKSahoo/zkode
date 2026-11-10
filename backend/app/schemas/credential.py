from pydantic import BaseModel, Field
from typing import Dict, Optional

class MintCredentialRequest(BaseModel):
    userSecretId: str = Field(..., description="Citizen master secret identity salt")
    birthTimestamp: str = Field(..., description="Date of birth in YYYYMMDD format (e.g. 20030416)")
    actualBalance: str = Field(..., description="Actual verified bank balance in INR")
    actualIncome: str = Field(..., description="Actual verified annual household income in INR")
    creditOrCgpaScore: str = Field(..., description="Credit or CGPA score scaled by 100 (e.g. 860)")
    expirationTimestamp: str = Field(..., description="Credential expiration date in YYYYMMDD format")

class BabyJubJubSignature(BaseModel):
    sigR8x: str
    sigR8y: str
    sigS: str

class IssuerPubKey(BaseModel):
    Ax: str
    Ay: str

class MintCredentialResponse(BaseModel):
    success: bool = True
    issuerPubKey: IssuerPubKey
    credential: Dict[str, str]
    error: Optional[str] = None
