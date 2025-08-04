#!/usr/bin/env node

/**
 * Test ZBRS Repository Import
 * 
 * Tests importing a local ZBRS repository into the Zaphnath database
 */

import { app } from 'electron';
import { DatabaseService } from '../packages/main/src/services/database/index.js';
import { RepositoryService } from '../packages/main/src/services/repository/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImport() {
  console.log('🧪 Testing ZBRS Repository Import...');
  
  try {
    // Initialize Electron app context (minimal)
    if (!app.isReady()) {
      await app.whenReady();
    }
    
    // Initialize services
    console.log('📊 Initializing database service...');
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    
    console.log('📦 Initializing repository service...');
    const repoService = RepositoryService.getInstance();
    await repoService.initialize();
    
    // Test repository path
    const repositoryPath = path.resolve(__dirname, '..', 'zbrs-repositories', 'kjv-1769');
    console.log(`📁 Testing repository: ${repositoryPath}`);
    
    // Validate repository
    console.log('✅ Validating repository...');
    const validation = await repoService.validateRepositoryUrl(`file://${repositoryPath}`);
    
    if (!validation.valid) {
      console.error('❌ Repository validation failed:');
      validation.errors.forEach(error => {
        console.error(`  - ${error.message}`);
      });
      return;
    }
    
    console.log('✅ Repository validation passed!');
    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => {
        console.log(`  - ${warning.message}`);
      });
    }
    
    // Import repository
    console.log('📥 Importing repository...');
    const importResult = await repoService.importRepository({
      repository_url: `file://${repositoryPath}`,
      validate_checksums: false, // Skip checksum validation for local files
      download_audio: false,
      overwrite_existing: true,
      progress_callback: (progress) => {
        console.log(`  ${progress.stage}: ${progress.progress}% - ${progress.message}`);
        if (progress.current_book) {
          console.log(`    Current book: ${progress.current_book} (${progress.processed_books}/${progress.total_books})`);
        }
      }
    });
    
    if (importResult.success) {
      console.log('🎉 Import successful!');
      console.log(`📚 Books imported: ${importResult.books_imported}`);
      console.log(`⏱️  Duration: ${importResult.duration_ms}ms`);
      
      if (importResult.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        importResult.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }
      
      // Test database queries
      console.log('\n📊 Testing database queries...');
      const stats = dbService.getStats();
      console.log(`Database stats:`, stats);
      
      const repositories = dbService.getRepositories();
      console.log(`Repositories in database: ${repositories.length}`);
      repositories.forEach(repo => {
        console.log(`  - ${repo.name} (${repo.id})`);
      });
      
      const books = dbService.getBooks();
      console.log(`Books in database: ${books.length}`);
      console.log(`First few books:`);
      books.slice(0, 5).forEach(book => {
        console.log(`  - ${book.name} (${book.testament}, ${book.chapter_count} chapters)`);
      });
      
      // Test verse retrieval
      const genesisVerses = dbService.getVerses(1, 1); // Genesis chapter 1
      console.log(`Genesis 1 verses: ${genesisVerses.length}`);
      if (genesisVerses.length > 0) {
        console.log(`Genesis 1:1 - "${genesisVerses[0].text}"`);
      }
      
    } else {
      console.error('❌ Import failed:');
      importResult.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.shutdown();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Exit the app
    if (app) {
      app.quit();
    }
  }
}

// Run the test
testImport().catch(console.error);
