export interface PrivateCredentials {
  userSecretId: string;
  birthTimestamp: string;
  actualBalance: string;
  actualIncome: string;
  creditOrCgpaScore: string;
  expirationTimestamp: string;
  sigR8x: string;
  sigR8y: string;
  sigS: string;
  issuerPubKeyAx: string;
  issuerPubKeyAy: string;
}

export interface PublicPolicy {
  currentTimestamp: string;
  maxBirthTimestamp: string;
  minBalanceRequired: string;
  maxIncomeAllowed: string;
  minScoreRequired: string;
  serviceScopeId: string;
}

export function buildWitness(
  credentials: PrivateCredentials,
  policy: PublicPolicy,
  sessionNonce: string
): Record<string, string> {
  return {
    // Private Inputs (100% Client RAM)
    userSecretId: credentials.userSecretId,
    birthTimestamp: credentials.birthTimestamp,
    actualBalance: credentials.actualBalance,
    actualIncome: credentials.actualIncome,
    creditOrCgpaScore: credentials.creditOrCgpaScore,
    expirationTimestamp: credentials.expirationTimestamp,
    sigR8x: credentials.sigR8x,
    sigR8y: credentials.sigR8y,
    sigS: credentials.sigS,

    // Public Inputs (Matching Circom main component order)
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

