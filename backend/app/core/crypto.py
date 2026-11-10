import os
import json
import subprocess
from typing import Dict, Any, Tuple

# Stable mock issuer private key for testing
ISSUER_PRIV_KEY_HEX = "0001020304050607080900010203040506070809000102030405060708090001"

def mint_babyjubjub_credential(
    user_secret_id: str,
    birth_timestamp: str,
    actual_balance: str,
    actual_income: str,
    credit_or_cgpa_score: str,
    expiration_timestamp: str
) -> Dict[str, Any]:
    """
    Mints a cryptographic credential signed with the Issuer's BabyJubJub EdDSA key.
    Calculates:
      1. holderCommitment = Poseidon(userSecretId)
      2. messageHash = Poseidon(holderCommitment, birthTimestamp, actualBalance, actualIncome, creditOrCgpaScore, expirationTimestamp)
      3. signature = EdDSAPoseidonSign(issuerPrivKey, messageHash)
    """
    circuits_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "circuits"))
    circomlib_path = os.path.join(circuits_dir, "node_modules", "circomlibjs")

    node_script = f"""
    const {{ buildPoseidon, buildEddsa }} = require('{circomlib_path.replace(os.sep, "/")}');
    async function mint() {{
      const poseidon = await buildPoseidon();
      const eddsa = await buildEddsa();
      
      const privKey = Buffer.from('{ISSUER_PRIV_KEY_HEX}', 'hex');
      const pubKey = eddsa.prv2pub(privKey);
      
      const userSecret = BigInt('{user_secret_id}');
      const birth = BigInt('{birth_timestamp}');
      const balance = BigInt('{actual_balance}');
      const income = BigInt('{actual_income}');
      const score = BigInt('{credit_or_cgpa_score}');
      const expiry = BigInt('{expiration_timestamp}');
      
      const holderCommitment = poseidon([userSecret]);
      const messageHash = poseidon([holderCommitment, birth, balance, income, score, expiry]);
      const sig = eddsa.signPoseidon(privKey, messageHash);
      
      const output = {{
        issuerPubKey: {{
          Ax: eddsa.F.toString(pubKey[0]),
          Ay: eddsa.F.toString(pubKey[1])
        }},
        credential: {{
          userSecretId: '{user_secret_id}',
          birthTimestamp: '{birth_timestamp}',
          actualBalance: '{actual_balance}',
          actualIncome: '{actual_income}',
          creditOrCgpaScore: '{credit_or_cgpa_score}',
          expirationTimestamp: '{expiration_timestamp}',
          sigR8x: eddsa.F.toString(sig.R8[0]),
          sigR8y: eddsa.F.toString(sig.R8[1]),
          sigS: sig.S.toString()
        }}
      }};
      console.log(JSON.stringify(output));
    }}
    mint().catch(err => {{
      console.error(err);
      process.exit(1);
    }});
    """

    res = subprocess.run(
        ["node", "-e", node_script],
        cwd=circuits_dir,
        capture_output=True,
        text=True,
        check=True
    )

    return json.loads(res.stdout.strip())
