import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requiredGates, verificationPassed, successfulProcess,
  assertNoSanitizerDiagnostic } from '../lib/verification.mjs';

test('every mandatory gate fails closed when failed, absent or merely truthy', () => {
  const passed = Object.fromEntries(requiredGates.map(key => [key, true]));
  assert.equal(verificationPassed(passed), true);
  for (const key of requiredGates) {
    for (const value of [false, undefined, null, 'passed', 1]) {
      assert.equal(verificationPassed({ ...passed, [key]: value }), false, key);
    }
    const missing = { ...passed };
    delete missing[key];
    assert.equal(verificationPassed(missing), false, key);
  }
});

test('container failure cannot be masked by other passing gates', () => {
  const gates = Object.fromEntries(requiredGates.map(key => [key, true]));
  gates.offlineContainer = false;
  assert.equal(verificationPassed(gates), false);
});

test('timeouts, signals, missing command and nonzero exits never pass', () => {
  assert.equal(successfulProcess({ status: 0 }), true);
  for (const result of [{ status: 1 }, { status: null }, { status: 0, signal: 'SIGTERM' },
    { status: 0, error: new Error('timeout') }]) assert.equal(successfulProcess(result), false);
});

test('sanitizer reports fail even on expected-invalid input cases', () => {
  for (const message of ['ERROR: AddressSanitizer: heap-buffer-overflow',
    'UndefinedBehaviorSanitizer: undefined-behavior', 'x.cpp:12: runtime error: overflow',
    'ERROR: LeakSanitizer: detected memory leaks', 'AddressSanitizer:DEADLYSIGNAL']) {
    assert.throws(() => assertNoSanitizerDiagnostic(message));
  }
  assert.doesNotThrow(() => assertNoSanitizerDiagnostic('error: timestamp is invalid\n'));
});
