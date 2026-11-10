import { NextResponse } from "next/server";
import { buildEddsa, buildPoseidon } from "circomlibjs";

// Deterministic mock private key for the demo issuing authority
const ISSUER_PRIVATE_KEY = Buffer.from(
  "0001020304050607080900010203040506070809000102030405060708090001",
  "hex"
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userSecretId = "981273918237192837129837192837",
      birthTimestamp = "20030416",
      actualBalance = "84500",
      actualIncome = "350000",
      creditOrCgpaScore = "860",
      expirationTimestamp = "20261115",
    } = body;

    const eddsa = await buildEddsa();
    const poseidon = await buildPoseidon();

    // 1. Derive issuer public key coordinates (Ax, Ay)
    const pubKey = eddsa.prv2pub(ISSUER_PRIVATE_KEY);
    const Ax = poseidon.F.toString(pubKey[0]);
    const Ay = poseidon.F.toString(pubKey[1]);

    // 2. Compute hidden holder commitment = Poseidon(userSecretId)
    const holderHash = poseidon([BigInt(userSecretId)]);

    // 3. Compute credential commitment hash
    const credHash = poseidon([
      holderHash,
      BigInt(birthTimestamp),
      BigInt(actualBalance),
      BigInt(actualIncome),
      BigInt(creditOrCgpaScore),
      BigInt(expirationTimestamp),
    ]);

    // 4. Sign the credential commitment hash using BabyJubJub EdDSA
    const signature = eddsa.signPoseidon(ISSUER_PRIVATE_KEY, credHash);

    return NextResponse.json({
      success: true,
      issuerPubKey: { Ax, Ay },
      credential: {
        userSecretId: userSecretId.toString(),
        birthTimestamp: birthTimestamp.toString(),
        actualBalance: actualBalance.toString(),
        actualIncome: actualIncome.toString(),
        creditOrCgpaScore: creditOrCgpaScore.toString(),
        expirationTimestamp: expirationTimestamp.toString(),
        sigR8x: poseidon.F.toString(signature.R8[0]),
        sigR8y: poseidon.F.toString(signature.R8[1]),
        sigS: signature.S.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
