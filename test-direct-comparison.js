import { ComparisonService } from './src/compare/ComparisonService.js';
import { ChunkedReportGenerator } from './src/report/ChunkedReportGenerator.js';
import ComparisonEngine from './src/compare/comparisonEngine.js';
import { promises as fs } from 'fs';
import path from 'path';

async function runDirectComparison() {
  try {
    // Create output directory with absolute path
    const outputDir = path.resolve('./output/reports');
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 Output directory:', outputDir);

    // Initialize comparison engine directly
    const comparisonEngine = new ComparisonEngine();
    const reportGenerator = new ChunkedReportGenerator({
      chunkSize: 10,
      maxStringLength: 1000000,
      maxArraySize: 1000,
      outputDir
    });

    // Use the already extracted Figma data
    const figmaData = {
      components: [
        {
          id: 'journey-list',
          name: 'Journey List',
          type: 'FRAME',
          tag: 'div',
          tagName: 'div',
          boundingBox: {
            x: 0,
            y: 0,
            width: 1024,
            height: 768
          },
          properties: {
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            padding: { top: 20, right: 20, bottom: 20, left: 20 }
          },
          styles: {
            colors: [
              'rgb(206, 209, 215)',
              'rgb(67, 79, 100)',
              'rgb(255, 190, 7)',
              'rgb(33, 31, 31)',
              'rgb(131, 140, 157)',
              'rgb(0, 0, 0)',
              'rgb(255, 141, 36)',
              'rgb(95, 105, 123)',
              'rgb(67, 67, 67)',
              'rgb(228, 54, 52)'
            ],
            typography: {
              fontFamily: 'Inter',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5
            },
            dimensions: {
              width: 1024,
              height: 768
            }
          }
        }
      ],
      metadata: {
        source: 'figma',
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        fileName: 'My Journeys',
        extractedAt: new Date().toISOString()
      }
    };

    // Use the already extracted web data
    const webData = {
      elements: [
        {
          tag: 'div',
          tagName: 'div',
          id: 'journey-list',
          classes: ['journey-list'],
          text: '',
          selector: '#journey-list',
          boundingBox: {
            x: 0,
            y: 0,
            width: 1024,
            height: 768
          },
          properties: {
            backgroundColor: 'rgb(255, 255, 255)',
            padding: '20px'
          },
          styles: {
            colors: [
              'rgb(206, 209, 215)',
              'rgb(67, 79, 100)',
              'rgb(255, 190, 7)'
            ],
            typography: {
              fontFamily: 'Inter',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5
            },
            dimensions: {
              width: 1024,
              height: 768
            }
          }
        }
      ],
      metadata: {
        url: 'https://www.freighttiger.com/v10/journey/listing',
        extractedAt: new Date().toISOString(),
        extractorVersion: '2.0.0'
      }
    };

    // Compare the data directly using the comparison engine
    console.log('🔍 Starting direct comparison...');
    const comparisonResult = await comparisonEngine.compareDesigns(figmaData, webData);
    console.log('✅ Comparison completed');

    // Generate report
    console.log('📊 Generating report...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `comparison-${timestamp}.json`;
    const reportPath = path.join(outputDir, reportFileName);
    
    // Transform comparison result to match expected format
    const reportData = {
      components: comparisonResult.comparisons || [],
      metadata: {
        ...comparisonResult.metadata,
        summary: comparisonResult.summary,
        timestamp
      }
    };
    
    const { stats } = await reportGenerator.generateReport(reportData, {
      format: 'json',
      compress: false,
      outputPath: reportPath,
      timestamp
    });
    console.log('✅ Report generated');
    
    // Output results
    console.log('\n📋 Comparison Results:');
    console.log('Total Components:', comparisonResult.summary.totalComponents);
    console.log('Total Deviations:', comparisonResult.summary.totalDeviations);
    console.log('Total Matches:', comparisonResult.summary.totalMatches);
    console.log('\nSeverity Breakdown:');
    console.log('High:', comparisonResult.summary.severity.high);
    console.log('Medium:', comparisonResult.summary.severity.medium);
    console.log('Low:', comparisonResult.summary.severity.low);
    
    console.log('\n📊 Report Stats:');
    console.log('Total Chunks:', stats.totalChunks);
    console.log('Processed Chunks:', stats.processedChunks);
    console.log('Generated At:', stats.timestamp);
    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Wait for the file to be written and verify it exists
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    let retries = 0;
    let report;

    while (retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const fileStats = await fs.stat(reportPath);
        if (!fileStats.isFile()) {
          throw new Error('Report file not found or is not a regular file');
        }
        
        report = await fs.readFile(reportPath, 'utf8');
        console.log('\n📄 Report Contents:');
        const parsedReport = JSON.parse(report);
        console.log(JSON.stringify(parsedReport, null, 2));
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          console.error('❌ Error accessing report file after multiple retries:', error.message);
          
          // List available reports
          try {
            console.log('\n📁 Available reports:');
            const files = await fs.readdir(outputDir);
            const reports = files.filter(f => f.startsWith('comparison-')).sort();
            if (reports.length === 0) {
              console.log('No reports found in output directory');
            } else {
              for (const file of reports.slice(-5)) {
                const filePath = path.join(outputDir, file);
                const stats = await fs.stat(filePath);
                console.log(`- ${file} (${stats.size} bytes)`);
              }
            }
          } catch (listError) {
            console.error('❌ Error listing reports:', listError.message);
          }
        } else {
          console.log(`Retrying in ${retryDelay}ms... (attempt ${retries}/${maxRetries})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

runDirectComparison(); 