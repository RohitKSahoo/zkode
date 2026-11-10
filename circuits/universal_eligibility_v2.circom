pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";

/**
 * @title UniversalEligibilityV2
 * @notice Parameterized multi-credential Zero-Knowledge verification circuit.
 */
template UniversalEligibilityV2() {
    // ================= PRIVATE INPUTS (100% Client RAM) =================
    signal input userSecretId;          // Master citizen identity salt
    signal input birthTimestamp;        // YYYYMMDD
    signal input actualBalance;         // In INR
    signal input actualIncome;          // In INR
    signal input creditOrCgpaScore;     // Scaled by 100 (e.g. 860)
    signal input expirationTimestamp;   // YYYYMMDD

    // Issuer BabyJubJub EdDSA Signature (Private to prevent linkability)
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    // ================= PUBLIC INPUTS (Server-Authoritative) =================
    signal input issuerPubKeyAx;        // Trusted Issuer Public Key X
    signal input issuerPubKeyAy;        // Trusted Issuer Public Key Y
    signal input currentTimestamp;      // Authoritative current server date (YYYYMMDD)
    signal input maxBirthTimestamp;     // Cutoff date for minimum age
    signal input minBalanceRequired;    // Minimum balance constraint (quantized to ₹25k)
    signal input maxIncomeAllowed;      // Income ceiling constraint (quantized to ₹25k)
    signal input minScoreRequired;      // Minimum CGPA / credit score constraint
    signal input serviceScopeId;        // Unique campaign/service scope identifier
    signal input sessionChallengeNonce; // 60-second anti-replay nonce from verifier

    // ================= PUBLIC OUTPUTS =================
    signal output isEligible;
    signal output nullifierHash;

    // 1. Holder Binding: Bind all attributes to a single hidden citizen commitment
    component holderHasher = Poseidon(1);
    holderHasher.inputs[0] <== userSecretId;

    component credHasher = Poseidon(6);
    credHasher.inputs[0] <== holderHasher.out;
    credHasher.inputs[1] <== birthTimestamp;
    credHasher.inputs[2] <== actualBalance;
    credHasher.inputs[3] <== actualIncome;
    credHasher.inputs[4] <== creditOrCgpaScore;
    credHasher.inputs[5] <== expirationTimestamp;

    // 2. In-Circuit Signature Verification (Prevents verifier tracking)
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;
    sigVerifier.Ax <== issuerPubKeyAx;
    sigVerifier.Ay <== issuerPubKeyAy;
    sigVerifier.R8x <== sigR8x;
    sigVerifier.R8y <== sigR8y;
    sigVerifier.S <== sigS;
    sigVerifier.M <== credHasher.out;

    // 3. Expiration Check: expirationTimestamp >= currentTimestamp
    component expiryCheck = GreaterEqThan(64);
    expiryCheck.in[0] <== expirationTimestamp;
    expiryCheck.in[1] <== currentTimestamp;

    // 4. Threshold Logic Execution
    component ageCheck = LessEqThan(64);
    ageCheck.in[0] <== birthTimestamp;
    ageCheck.in[1] <== maxBirthTimestamp;

    component balanceCheck = GreaterEqThan(64);
    balanceCheck.in[0] <== actualBalance;
    balanceCheck.in[1] <== minBalanceRequired;

    component incomeCheck = LessEqThan(64);
    incomeCheck.in[0] <== actualIncome;
    incomeCheck.in[1] <== maxIncomeAllowed;

    component scoreCheck = GreaterEqThan(32);
    scoreCheck.in[0] <== creditOrCgpaScore;
    scoreCheck.in[1] <== minScoreRequired;

    // 5. Strict R1CS Quadratic Accumulation
    signal c1;
    signal c2;
    signal c3;
    c1 <== expiryCheck.out * ageCheck.out;
    c2 <== balanceCheck.out * incomeCheck.out;
    c3 <== c1 * c2;
    isEligible <== c3 * scoreCheck.out;
    isEligible === 1;

    // 6. Sybil-Resistant Deterministic Nullifier: Poseidon(userSecretId, serviceScopeId)
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== userSecretId;
    nullifier.inputs[1] <== serviceScopeId;
    nullifierHash <== nullifier.out;

    // 7. Anti-Replay Session Lock (Ensures optimizer cannot strip sessionChallengeNonce)
    signal nonceLock;
    nonceLock <== sessionChallengeNonce * sessionChallengeNonce;
}

component main {public [
    issuerPubKeyAx,
    issuerPubKeyAy,
    currentTimestamp,
    maxBirthTimestamp,
    minBalanceRequired,
    maxIncomeAllowed,
    minScoreRequired,
    serviceScopeId,
    sessionChallengeNonce
]} = UniversalEligibilityV2();
