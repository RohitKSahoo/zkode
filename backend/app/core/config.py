import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Demo Issuer BabyJubJub Public Key (matches deterministic mint route)
ISSUER_PUBKEY_AX = os.getenv(
    "ISSUER_PUBKEY_AX",
    "1846294719203948571920394857192039485719203948571920394857"
)
ISSUER_PUBKEY_AY = os.getenv(
    "ISSUER_PUBKEY_AY",
    "928374910293847561029384756102938475610293847561029384756"
)

QUANTIZATION_STEP = 25000

