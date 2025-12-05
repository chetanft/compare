/**
 * Verification Script for New Modules
 * Tests the core functionality of the newly created services and registries.
 */

import { getDesignSystemRegistry, SHADCN_TOKENS } from '../src/design-system/DesignSystemRegistry.js';
import { createTokenMapper } from '../src/design-system/TokenMapper.js';
import { createCredentialManager } from '../src/services/CredentialEncryption.js';
import { createNotificationService } from '../src/services/NotificationService.js';
import { createVisualDiffService } from '../src/services/VisualDiffService.js';

async function verifyModules() {
    console.log('🔍 Starting verification of new modules...\n');
    let errors = 0;

    // 1. Verify Design System Registry
    try {
        console.log('1️⃣  Testing DesignSystemRegistry...');
        const registry = getDesignSystemRegistry();
        const shadcn = registry.get('shadcn');
        const ftds = registry.get('ft-ds');

        if (!shadcn || shadcn.name !== 'ShadCN UI') throw new Error('ShadCN registry lookup failed');
        if (!ftds || ftds.name !== 'FT Design System') throw new Error('FT-DS registry lookup failed');

        // Test token finding
        const closest = registry.findClosestToken('shadcn', 'colors', null, '#000000');
        console.log(`   ✅ Registry initialized with ${registry.getAll().length} systems`);
        console.log(`   ✅ Token lookup test: #000000 -> ${closest?.token || 'none'}`);
    } catch (e) {
        console.error(`   ❌ DesignSystemRegistry failed: ${e.message}`);
        errors++;
    }

    // 2. Verify Token Mapper
    try {
        console.log('\n2️⃣  Testing TokenMapper...');
        const mapper = createTokenMapper('shadcn');
        const colorMatch = mapper.mapColor('#ffffff'); // Should match background/card
        const spacingMatch = mapper.mapSpacing('16px'); // Should match spacing.4 (1rem)

        console.log(`   ✅ Color mapping: #ffffff -> ${colorMatch.token} (Distance: ${colorMatch.distance})`);
        console.log(`   ✅ Spacing mapping: 16px -> ${spacingMatch.token} (Distance: ${spacingMatch.distance})`);
    } catch (e) {
        console.error(`   ❌ TokenMapper failed: ${e.message}`);
        errors++;
    }

    // 3. Verify Credential Encryption
    try {
        console.log('\n3️⃣  Testing CredentialEncryption...');
        const mockKey = '12345678901234567890123456789012'; // 32 chars
        const manager = createCredentialManager(mockKey);

        const original = { username: 'testuser', password: 'secretpassword' };
        const encrypted = manager.encryptCredentials(original);
        const decrypted = manager.decryptCredentials(encrypted);

        if (decrypted.username !== original.username || decrypted.password !== original.password) {
            throw new Error('Decryption result does not match original');
        }
        console.log('   ✅ Encryption/Decryption cycle successful');
    } catch (e) {
        console.error(`   ❌ CredentialEncryption failed: ${e.message}`);
        errors++;
    }

    // 4. Verify Notification Service
    try {
        console.log('\n4️⃣  Testing NotificationService...');
        const notifications = createNotificationService();
        // Just verify it instantiates and has methods
        if (typeof notifications.notify !== 'function') throw new Error('Missing notify method');
        console.log('   ✅ NotificationService initialized');
    } catch (e) {
        console.error(`   ❌ NotificationService failed: ${e.message}`);
        errors++;
    }

    // 5. Verify Visual Diff Service
    try {
        console.log('\n5️⃣  Testing VisualDiffService...');
        const visualDiff = createVisualDiffService({ apiKey: 'mock-key' });
        if (typeof visualDiff.compare !== 'function') throw new Error('Missing compare method');
        console.log('   ✅ VisualDiffService initialized');
    } catch (e) {
        console.error(`   ❌ VisualDiffService failed: ${e.message}`);
        errors++;
    }

    console.log('\n----------------------------------------');
    if (errors === 0) {
        console.log('🎉 All modules verified successfully!');
        process.exit(0);
    } else {
        console.error(`⚠️  Verification completed with ${errors} errors.`);
        process.exit(1);
    }
}

verifyModules();
