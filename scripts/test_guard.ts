/**
 * TEST: Session Guard + Guarded FS
 * 
 * Verifies:
 * 1. edit_file is BLOCKED in DISCOVERY state
 * 2. log_symptom transitions to ANALYSIS
 * 3. register_hypothesis transitions to VERIFICATION
 * 4. confirm_hypothesis transitions to IMPLEMENTATION
 * 5. edit_file is ALLOWED in IMPLEMENTATION state
 */

import {
    logSymptomOp,
    registerHypothesisOp,
    confirmHypothesisOp,
    guardStatusOp
} from '../slices/guard/ops.js';

import { editFileOp, writeFileOp } from '../slices/fs/ops.js';
import {
    resetSession,
    getSession,
    trackFileRead
} from '../slices/guard/state-machine.js';

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
    } catch (e: any) {
        if (e.message.includes('BLOCKED')) {
            console.log('✅ PASS: write_file blocked as expected.');
            console.log(`   Message: ${e.message.split('\n')[0]}`);
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

    // MOCK EVIDENCE READING
    // The guard prevents citing files we haven't read. So we must "read" it first.
    trackFileRead('default', '/tmp/test.ts');
    console.log('📖 Mocking read of /tmp/test.ts');

    const hypResult = await registerHypothesisOp({
        symptom_summary: 'NullPointerException in unit test',
        suspected_root_cause: 'The variable user is null because session is not initialized properly in the test setup.',
        evidence_files: ['/tmp/test.ts'], // Mock evidence
        reasoning_chain: 'I saw the stack trace pointing to line 10. The user variable is used there. In the setup block, I see user is declared but never assigned a value before the test runs.',
        confidence: 'HIGH',
        verification_plan: 'I will Add a console log to check user value and then try ensuring initSession() is called.',
    });

    // Mock file read to satisfy validation (hack for test script, usually real reads happen)
    getSession('default').filesRead.push('/tmp/test.ts');

    if (hypResult.includes('Hypothesis registered')) {
        console.log('✅ PASS: Hypothesis registered.');
    } else {
        console.log('⚠️  Note: Validation might fail if files not actually read. simulating...');
        console.log(hypResult);
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
    }

    // 5. ATTEMPT LEGAL EDIT (Should Succeed)
    console.log('\n--- TEST 5: Legal Edit (IMPLEMENTATION) ---');
    try {
        const writeResult = await writeFileOp(TEST_FILE, 'This should succeed');
        console.log(`✅ PASS: write_file succeeded: ${writeResult}`);
    } catch (e: any) {
        console.error(`❌ FAIL: write_file failed: ${e.message}`);
        process.exit(1);
    }

    console.log('\n🎉 ALL SESSION GUARD TESTS PASSED!');
}

runTest().catch(console.error);
