from pydantic import BaseModel, Field

class ChallengeResponse(BaseModel):
    sessionId: str = Field(..., description="UUID or hex identifier for the ephemeral challenge session")
    sessionNonce: str = Field(..., description="BN254 scalar field compatible 240-bit decimal nonce string")
    expiresAt: int = Field(..., description="Unix epoch timestamp in milliseconds when the nonce expires")
    ttlSeconds: int = Field(default=60, description="Time to live in seconds")
