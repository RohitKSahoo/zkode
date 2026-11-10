import { test, describe } from "node:test";
import assert from "node:assert/strict";

function buildWitness(credentials, policy, sessionNonce) {
  return {
    // Private Inputs
    userSecretId: credentials.userSecretId,
    birthTimestamp: credentials.birthTimestamp,
    actualBalance: credentials.actualBalance,
    actualIncome: credentials.actualIncome,
    creditOrCgpaScore: credentials.creditOrCgpaScore,
    expirationTimestamp: credentials.expirationTimestamp,
    sigR8x: credentials.sigR8x,
    sigR8y: credentials.sigR8y,
    sigS: credentials.sigS,

    // Public Inputs
    issuerPubKeyAx: credentials.issuerPubKeyAx,
    issuerPubKeyAy: credentials.issuerPubKeyAy,
    currentTimestamp: policy.currentTimestamp,
    maxBirthTimestamp: policy.maxBirthTimestamp,
    minBalanceRequired: policy.minBalanceRequired,
    maxIncomeAllowed: policy.maxIncomeAllowed,
    minScoreRequired: policy.minScoreRequired,
    serviceScopeId: policy.serviceScopeId,
    sessionChallengeNonce: sessionNonce,
  };
}

describe("Frontend Witness Builder Unit Tests", () => {
  const credentials = {
    userSecretId: "981273918237192837129837192837",
    birthTimestamp: "20030416",
    actualBalance: "84500",
    actualIncome: "350000",
    creditOrCgpaScore: "860",
    expirationTimestamp: "20261115",
    sigR8x: "15983502441014741693118001401111597102620505013186307209250310093672474092456",
    sigR8y: "1979485915277033923079535022718253435669059167959695902127897338093088485962",
    sigS: "135030378803597992460893792216210384268754990109084567856506613330019146666",
    issuerPubKeyAx: "13277427435165878497778222415993513565335242147425444199013288855685581939618",
    issuerPubKeyAy: "13622229784656158136036771217484571176836296686641868549125388198837476602820",
  };

  const policy = {
    currentTimestamp: "20261110",
    maxBirthTimestamp: "20081110",
    minBalanceRequired: "50000",
    maxIncomeAllowed: "800000",
    minScoreRequired: "800",
    serviceScopeId: "901",
  };

  const nonce = "14839201948572019485720194857201948572019485720";

  test("correctly structures all 9 private inputs and 9 public inputs", () => {
    const witness = buildWitness(credentials, policy, nonce);
    
    // Check all 18 keys are present
    const keys = Object.keys(witness);
    assert.equal(keys.length, 18);

    // Check private inputs
    assert.equal(witness.userSecretId, credentials.userSecretId);
    assert.equal(witness.birthTimestamp, credentials.birthTimestamp);
    assert.equal(witness.actualBalance, credentials.actualBalance);
    assert.equal(witness.actualIncome, credentials.actualIncome);
    assert.equal(witness.creditOrCgpaScore, credentials.creditOrCgpaScore);
    assert.equal(witness.expirationTimestamp, credentials.expirationTimestamp);
    assert.equal(witness.sigR8x, credentials.sigR8x);
    assert.equal(witness.sigR8y, credentials.sigR8y);
    assert.equal(witness.sigS, credentials.sigS);

    // Check public inputs
    assert.equal(witness.issuerPubKeyAx, credentials.issuerPubKeyAx);
    assert.equal(witness.issuerPubKeyAy, credentials.issuerPubKeyAy);
    assert.equal(witness.currentTimestamp, policy.currentTimestamp);
    assert.equal(witness.maxBirthTimestamp, policy.maxBirthTimestamp);
    assert.equal(witness.minBalanceRequired, policy.minBalanceRequired);
    assert.equal(witness.maxIncomeAllowed, policy.maxIncomeAllowed);
    assert.equal(witness.minScoreRequired, policy.minScoreRequired);
    assert.equal(witness.serviceScopeId, policy.serviceScopeId);
    assert.equal(witness.sessionChallengeNonce, nonce);
  });
});

