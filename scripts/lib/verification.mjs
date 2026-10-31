// Shared fail-closed policy. Tests of this module test tooling, never the solver.
export const requiredGates = Object.freeze([
  'developmentTooling', 'nativeBuild', 'localContract',
  'sanitizerBuild', 'sanitizerContract', 'linuxExecution', 'offlineContainer', 'unchangedSources',
]);

export function verificationPassed(gates) {
  return requiredGates.every(name => gates[name] === true);
}

export function successfulProcess(result) {
  return !result.error && !result.signal && result.status === 0;
}

export function assertNoSanitizerDiagnostic(stderr) {
  if (/AddressSanitizer|UndefinedBehaviorSanitizer|LeakSanitizer|runtime error:|Sanitizer:DEADLYSIGNAL/i.test(String(stderr))) {
    throw new Error(`Sanitizer diagnostic: ${String(stderr).slice(0, 1000)}`);
  }
}
