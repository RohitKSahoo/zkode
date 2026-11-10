const QUANTIZATION_STEP = 25000;

export function validatePolicyEntropy(policy: Record<string, string>): void {
  const balance = parseInt(policy.minBalanceRequired, 10);
  const income = parseInt(policy.maxIncomeAllowed, 10);

  if (balance % QUANTIZATION_STEP !== 0) {
    throw new Error(
      `SECURITY EXCEPTION: Asset threshold (₹${balance.toLocaleString()}) is not quantized to ₹${QUANTIZATION_STEP.toLocaleString()} increments. Possible binary-search probing attack.`
    );
  }

  if (income % QUANTIZATION_STEP !== 0 && income !== 999999999) {
    throw new Error(
      `SECURITY EXCEPTION: Income ceiling (₹${income.toLocaleString()}) is not quantized to ₹${QUANTIZATION_STEP.toLocaleString()} increments.`
    );
  }

  if (typeof window !== "undefined") {
    const queryKey = `zkode_probe_guard_${policy.serviceScopeId || "default"}`;
    const lastCall = localStorage.getItem(queryKey);
    const now = Date.now();

    if (lastCall && now - parseInt(lastCall, 10) < 4000) {
      throw new Error("SECURITY EXCEPTION: Rate threshold exceeded. Query throttled to block automated extraction.");
    }
    localStorage.setItem(queryKey, now.toString());
  }
}
