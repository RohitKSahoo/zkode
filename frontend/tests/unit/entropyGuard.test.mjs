import { test, describe } from "node:test";
import assert from "node:assert/strict";

const QUANTIZATION_STEP = 25000;

function validatePolicyEntropy(policy) {
  const balance = parseInt(policy.minBalanceRequired, 10);
  const income = parseInt(policy.maxIncomeAllowed, 10);

  if (balance % QUANTIZATION_STEP !== 0) {
    throw new Error(
      `SECURITY EXCEPTION: Asset threshold (₹${balance}) is not quantized to ₹${QUANTIZATION_STEP} increments.`
    );
  }

  if (income % QUANTIZATION_STEP !== 0 && income !== 999999999) {
    throw new Error(
      `SECURITY EXCEPTION: Income ceiling (₹${income}) is not quantized to ₹${QUANTIZATION_STEP} increments.`
    );
  }
}

describe("Frontend Entropy Guard Unit Tests", () => {
  test("allows valid quantized policy thresholds", () => {
    const validPolicy = {
      minBalanceRequired: "50000",
      maxIncomeAllowed: "800000",
      serviceScopeId: "901"
    };
    assert.doesNotThrow(() => validatePolicyEntropy(validPolicy));
  });

  test("allows unrestricted income ceiling (999999999)", () => {
    const openIncomePolicy = {
      minBalanceRequired: "25000",
      maxIncomeAllowed: "999999999",
      serviceScopeId: "901"
    };
    assert.doesNotThrow(() => validatePolicyEntropy(openIncomePolicy));
  });

  test("rejects unquantized balance probe to prevent micro-targeting", () => {
    const probePolicy = {
      minBalanceRequired: "63412", // Non-quantized probe
      maxIncomeAllowed: "800000",
      serviceScopeId: "901"
    };
    assert.throws(
      () => validatePolicyEntropy(probePolicy),
      /SECURITY EXCEPTION: Asset threshold/
    );
  });

  test("rejects unquantized income ceiling", () => {
    const probePolicy = {
      minBalanceRequired: "50000",
      maxIncomeAllowed: "789123", // Non-quantized probe
      serviceScopeId: "901"
    };
    assert.throws(
      () => validatePolicyEntropy(probePolicy),
      /SECURITY EXCEPTION: Income ceiling/
    );
  });
});

