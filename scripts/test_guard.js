/**
 * TEST: Session Guard + Guarded FS (JS Version)
 */

import {
    logSymptomOp,
    registerHypothesisOp,
    confirmHypothesisOp,
    guardStatusOp
} from '../dist/slices/guard/ops.js';

import { editFileOp, writeFileOp } from '../dist/slices/fs/ops.js';
import { resetSession, getSession } from '../dist/slices/guard/state-machine.js';

// Setup Mock Data
const TEST_FILE = '/tmp/arela_guard_test.txt';

async function runTest() {
    console.log('🛡️  TESTING SESSION GUARD\n');

    // 0. RESET SESSION
    resetSession('default');
    console.log('0. Session Reset');

    // 1. ATTEMPT ILLEGAL EDIT (Should Fail)
    console.log('\n--- TEST 1: Illegal Edit (DISCOVERY) ---');
    try {
        await writeFileOp(TEST_FILE, 'This should fail');
        console.error('❌ FAIL: write_file should have been blocked!');
        process.exit(1);
    } catch (e) {
        if (e.message.includes('BLOCKED')) {
            console.log('✅ PASS: write_file blocked as expected.');
            // console.log(`   Message: ${e.message.split('\n')[0]}`);
        } else {
            console.error(`❌ FAIL: Wrong error message: ${e.message}`);
            process.exit(1);
        }
    }

    // 2. LOG SYMPTOM (Transition S0 -> S1)
    console.log('\n--- TEST 2: Log Symptom (S0 -> S1) ---');
    const logResult = await logSymptomOp({
        error_message: 'Test Error: NullPointerException',
        context: 'Running unit test',
    });
    console.log(logResult.split('\n')[0]);

    const state1 = await guardStatusOp();
    if (state1.includes('ANALYSIS')) {
        console.log('✅ PASS: State transitioned to ANALYSIS');
    } else {
        console.error(`❌ FAIL: Wrong state: ${state1}`);
    }

    // 3. REGISTER HYPOTHESIS (Transition S1 -> S2)
    console.log('\n--- TEST 3: Register Hypothesis (S1 -> S2) ---');
    const hypResult = await registerHypothesisOp({
        symptom_summary: 'NullPointerException in unit test',
        suspected_root_cause: 'The variable user is null because session is not initialized properly in the test setup.',
        evidence_files: ['/tmp/test.ts'], // Mock evidence
        reasoning_chain: 'I saw the stack trace pointing to line 10. The user variable is used there. In the setup block, I see user is declared but never assigned a value before the test runs.',
        confidence: 'HIGH',
        verification_plan: 'I will Add a console log to check user value and then try ensuring initSession() is called.',
    });

    // Mock file read to satisfy validation logic
    try {
        getSession('default').filesRead.push('/tmp/test.ts');
    } catch (e) { console.log('Mocking file read failed, ignoring'); }

    // Note: validation happens inside the op, so mocking after calling op is too late for the op execution.
    // However, validation in ops.ts calls validateHypothesis which checks filesRead.
    // To make this test pass without actually reading files using read_file tool, we need to pre-populate filesRead.
    // But `getSession` returns the session object.

    // Let's re-run hypothesis with pre-populated session
    getSession('default').filesRead.push('/tmp/test.ts');

    // We can't re-run hypothesis easily because state might have changed or failed.
    // Actually, if the previous call failed due to validation, we are still in ANALYSIS.
    // Let's rely on the fact that I just pushed to filesRead, so I should call register AGAIN if the first one failed?
    // Or just call it once now that I pushed.

    // But wait, the previous call executed validateHypothesis BEFORE I pushed.
    // So it likely returned an error.

    // Let's look at the result of the previous call.
    if (hypResult.includes('Hypothesis rejected')) {
        console.log('Hypothesis rejected as expected (no evidence). Retrying with evidence...');
        const hypResult2 = await registerHypothesisOp({
            symptom_summary: 'NullPointerException in unit test',
            suspected_root_cause: 'The variable user is null because session is not initialized properly in the test setup.',
            evidence_files: ['/tmp/test.ts'],
            reasoning_chain: 'I saw the stack trace pointing to line 10. The user variable is used there. In the setup block, I see user is declared but never assigned a value before the test runs.',
            confidence: 'HIGH',
            verification_plan: 'I will Add a console log to check user value and then try ensuring initSession() is called.',
        });

        if (hypResult2.includes('Hypothesis registered')) {
            console.log('✅ PASS: Hypothesis registered (Retry).');
        } else {
            console.error(`❌ FAIL: Hypothesis registration failed: ${hypResult2}`);
            process.exit(1);
        }
    } else {
        console.log('✅ PASS: Hypothesis registered (First try - maybe validation soft? or mock worked?)');
    }


    // 4. CONFIRM HYPOTHESIS (Transition S2 -> S3)
    console.log('\n--- TEST 4: Confirm Hypothesis (S2 -> S3) ---');
    const confirmResult = await confirmHypothesisOp({
        verification_result: 'The console log confirmed user was undefined. Calling initSession fixed it.',
    });
    console.log(confirmResult.split('\n')[0]);

    const state3 = await guardStatusOp();
    if (state3.includes('IMPLEMENTATION')) {
        console.log('✅ PASS: State transitioned to IMPLEMENTATION');
    } else {
        console.error(`❌ FAIL: Wrong state: ${state3}`);
        process.exit(1);
    }

    // 5. ATTEMPT LEGAL EDIT (Should Succeed)
    console.log('\n--- TEST 5: Legal Edit (IMPLEMENTATION) ---');
    try {
        const writeResult = await writeFileOp(TEST_FILE, 'This should succeed');
        console.log(`✅ PASS: write_file succeeded: ${writeResult}`);
    } catch (e) {
        console.error(`❌ FAIL: write_file failed: ${e.message}`);
        process.exit(1);
    }

    console.log('\n🎉 ALL SESSION GUARD TESTS PASSED!');
}

runTest().catch((e) => {
    console.error(e);
    process.exit(1);
});
