import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildEddsa, buildPoseidon } from "circomlibjs";

const ISSUER_PRIVATE_KEY = Buffer.from(
  "0001020304050607080900010203040506070809000102030405060708090001",
  "hex"
);

describe("BabyJubJub EdDSA & Poseidon Credential Minting Unit Tests", () => {
  test("generates valid EdDSA signature and matches issuer public key", async () => {
    const eddsa = await buildEddsa();
    const poseidon = await buildPoseidon();

    // 1. Derive issuer public key coordinates
    const pubKey = eddsa.prv2pub(ISSUER_PRIVATE_KEY);
    const Ax = poseidon.F.toString(pubKey[0]);
    const Ay = poseidon.F.toString(pubKey[1]);

    // Check expected BabyJubJub generator point coordinates
    assert.equal(Ax, "13277427435165878497778222415993513565335242147425444199013288855685581939618");
    assert.equal(Ay, "13622229784656158136036771217484571176836296686641868549125388198837476602820");

    // 2. Holder commitment = Poseidon(userSecretId)
    const userSecretId = "981273918237192837129837192837";
    const holderHash = poseidon([BigInt(userSecretId)]);

    // 3. Composite credential commitment hash
    const credHash = poseidon([
      holderHash,
      BigInt("20030416"),
      BigInt("84500"),
      BigInt("350000"),
      BigInt("860"),
      BigInt("20261115")
    ]);

    // 4. EdDSA signature over Poseidon hash
    const signature = eddsa.signPoseidon(ISSUER_PRIVATE_KEY, credHash);
    const isValid = eddsa.verifyPoseidon(credHash, signature, pubKey);
    assert.equal(isValid, true, "EdDSA signature must verify over the Poseidon commitment hash");
  });
});

