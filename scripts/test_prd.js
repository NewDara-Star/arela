#!/usr/bin/env node

/**
 * Test script for arela_prd tool
 * Dogfood: Tests our own PRD system
 */

import { parsePRD, extractUserStories } from '../dist/slices/prd/parser.js';
import { listPRDs, getPRD, getPRDStatus } from '../dist/slices/prd/ops.js';
import fs from 'fs-extra';
import path from 'path';

const CWD = process.cwd();

async function testPRD() {
    console.log('🧪 Testing arela_prd (Dogfooding)\n');
    console.log('='.repeat(50));

    // Test 1: List PRDs
    console.log('\n📋 Test 1: List PRDs');
    try {
        process.env.CWD = CWD;
        const prds = await listPRDs();
        console.log(`   Found ${prds.length} PRD(s):`);
        prds.forEach(p => console.log(`   - ${p.id}: ${p.title} [${p.status}]`));
        console.log('   ✅ PASS\n');
    } catch (e) {
        console.log(`   ❌ FAIL: ${e.message}\n`);
    }

    // Test 2: Parse PRD
    console.log('📄 Test 2: Parse PRD');
    try {
        const prdPath = 'prds/spec-to-test-compiler.prd.md';
        const prd = await getPRD(prdPath);
        console.log(`   Title: ${prd.title}`);
        console.log(`   ID: ${prd.frontmatter.id}`);
        console.log(`   Type: ${prd.frontmatter.type}`);
        console.log(`   Status: ${prd.frontmatter.status}`);
        console.log(`   Sections: ${prd.sections.length}`);
        prd.sections.forEach(s => console.log(`   - ${s.header} (lines ${s.lineStart}-${s.lineEnd})`));
        console.log('   ✅ PASS\n');
    } catch (e) {
        console.log(`   ❌ FAIL: ${e.message}\n`);
    }

    // Test 3: Get PRD Status
    console.log('📊 Test 3: Get PRD Status');
    try {
        const prdPath = 'prds/spec-to-test-compiler.prd.md';
        const status = await getPRDStatus(prdPath);
        console.log(`   ID: ${status.id}`);
        console.log(`   Status: ${status.status}`);
        console.log(`   User Stories: ${status.userStoryCount}`);
        console.log('   ✅ PASS\n');
    } catch (e) {
        console.log(`   ❌ FAIL: ${e.message}\n`);
    }

    // Test 4: Extract User Stories
    console.log('📖 Test 4: Extract User Stories');
    try {
        const prdPath = 'prds/spec-to-test-compiler.prd.md';
        const content = await fs.readFile(path.join(CWD, prdPath), 'utf-8');
        const prd = parsePRD(content, prdPath);
        const stories = extractUserStories(prd);
        console.log(`   Found ${stories.length} user stories:`);
        stories.forEach(s => {
            console.log(`   - ${s.id}: ${s.title}`);
            console.log(`     As a: ${s.asA}`);
            console.log(`     I want: ${s.iWant}`);
            console.log(`     So that: ${s.soThat}`);
            console.log(`     Criteria: ${s.acceptanceCriteria.length} items`);
        });
        console.log('   ✅ PASS\n');
    } catch (e) {
        console.log(`   ❌ FAIL: ${e.message}\n`);
    }

    console.log('='.repeat(50));
    console.log('🎉 arela_prd dogfooding complete!\n');
}

testPRD().catch(console.error);
