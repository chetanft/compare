#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';

import FigmaExtractor from './figma/extractor.js';
import WebExtractor from './scraper/webExtractor.js';
import ComparisonEngine from './compare/comparisonEngine.js';
import VisualDiff from './visual/visualDiff.js';
import ReportGenerator from './report/reportGenerator.js';

const program = new Command();

// Load configuration
async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(chalk.red('❌ Error loading config.json'));
    console.log(chalk.yellow('💡 Make sure config.json exists in the current directory'));
    process.exit(1);
  }
}

// Main comparison command
async function runComparison(options) {
  const spinner = ora('Loading configuration...').start();
  
  try {
    const config = await loadConfig();
    
    // Override config with CLI options
    if (options.figmaFile) config.figma.fileId = options.figmaFile;
    if (options.figmaNode) config.figma.nodeId = options.figmaNode;
    if (options.url) config.webUrl = options.url;
    if (options.selector) config.webSelector = options.selector;

    spinner.text = 'Initializing extractors...';
    
    // Initialize extractors
    const figmaExtractor = new FigmaExtractor(config);
    const webExtractor = new WebExtractor(config);
    const comparisonEngine = new ComparisonEngine(config);
    const reportGenerator = new ReportGenerator(config);

    // Extract Figma design data
    spinner.text = 'Extracting Figma design data...';
    const figmaData = await figmaExtractor.extractDesignData(
      config.figma.fileId, 
      config.figma.nodeId
    );
    console.log(chalk.green(`✅ Extracted ${figmaData.components.length} components from Figma`));

    // Extract web styles
    spinner.text = 'Extracting web styles...';
    const webData = await webExtractor.extractStyles(
      config.webUrl || options.url,
      config.webSelector || options.selector
    );
    console.log(chalk.green('✅ Extracted web styles'));

    // Compare designs
    spinner.text = 'Comparing designs...';
    const comparisonReport = await comparisonEngine.compareDesigns(figmaData, webData);
    console.log(chalk.green(`✅ Comparison complete: ${comparisonReport.metadata.totalDeviations} deviations found`));

    // Visual comparison (if enabled)
    let visualReport = null;
    if (options.visual) {
      spinner.text = 'Performing visual comparison...';
      const visualDiff = new VisualDiff(config);
      
      // This would require actual images - for demo, we'll skip
      console.log(chalk.yellow('⚠️ Visual comparison skipped (requires actual screenshots)'));
    }

    // Generate reports
    spinner.text = 'Generating reports...';
    
    // Save JSON report
    const jsonReportPath = path.join(
      config.output?.reportDir || './output/reports',
      `comparison-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    await comparisonEngine.saveReport(comparisonReport, jsonReportPath);

    // Generate HTML report
    const htmlReportPath = await reportGenerator.generateReport(comparisonReport, visualReport, {
      figmaData,
      webData
    });
    
    spinner.succeed('Comparison complete!');

    // Display summary
    console.log('\n' + chalk.bold('📊 Summary:'));
    console.log(`Components analyzed: ${chalk.cyan(comparisonReport.comparisons.length)}`);
    console.log(`Total deviations: ${chalk.red(comparisonReport.metadata.totalDeviations)}`);
    console.log(`High severity: ${chalk.red(comparisonReport.metadata.severity.high)}`);
    console.log(`Medium severity: ${chalk.yellow(comparisonReport.metadata.severity.medium)}`);
    console.log(`Low severity: ${chalk.blue(comparisonReport.metadata.severity.low)}`);
    
    console.log('\n' + chalk.bold('📁 Reports generated:'));
    console.log(`JSON: ${chalk.green(jsonReportPath)}`);
    console.log(`HTML: ${chalk.green(htmlReportPath)}`);

    // Cleanup
    await webExtractor.cleanup();

  } catch (error) {
    spinner.fail('Comparison failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Configure CLI commands
program
  .name('figma-web-compare')
  .description('Compare Figma designs with live web implementations')
  .version('1.0.0');

program
  .command('compare')
  .description('Run design comparison')
  .option('-f, --figma-file <fileId>', 'Figma file ID')
  .option('-n, --figma-node <nodeId>', 'Figma node ID')
  .option('-u, --url <url>', 'Web page URL to compare')
  .option('-s, --selector <selector>', 'CSS selector for web component')
  .option('-v, --visual', 'Include visual diff comparison')
  .option('--headless <boolean>', 'Run browser in headless mode', true)
  .action(runComparison);

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    const spinner = ora('Creating config.json...').start();
    
    try {
      const defaultConfig = {
        figma: {
          accessToken: "",
          fileId: "",
          nodeId: ""
        },
        comparison: {
          thresholds: {
            fontSize: 2,
            spacing: 4,
            borderRadius: 2,
            colorTolerance: 5
          },
          properties: [
            "fontSize",
            "fontFamily",
            "fontWeight",
            "color",
            "backgroundColor",
            "borderColor",
            "borderRadius",
            "padding",
            "margin",
            "width",
            "height",
            "boxShadow"
          ]
        },
        puppeteer: {
          headless: "new",
          viewport: {
            width: 1920,
            height: 1080
          },
          timeout: 30000
        },
        output: {
          reportFormat: "html",
          screenshotDir: "./output/screenshots",
          reportDir: "./output/reports"
        }
      };

      await fs.writeFile('config.json', JSON.stringify(defaultConfig, null, 2));
      spinner.succeed('Configuration file created!');
      
      console.log('\n' + chalk.bold('📝 Next steps:'));
      console.log('1. Edit config.json with your Figma access token and file details');
      console.log('2. Run: npm run compare -- --url <your-web-url> --selector <css-selector>');
      
    } catch (error) {
      spinner.fail('Failed to create config file');
      console.error(chalk.red('❌ Error:'), error.message);
    }
  });

program
  .command('test')
  .description('Test the tool with sample data')
  .action(async () => {
    console.log(chalk.blue('🧪 Running test comparison...'));
    
    const spinner = ora('Creating test data...').start();
    
    try {
      // Create sample data for testing
      const testFigmaData = {
        fileName: "Test Design System",
        components: [
          {
            id: "1:2",
            name: "Primary Button",
            type: "FRAME",
            properties: {
              typography: {
                fontFamily: "Inter",
                fontSize: 16,
                fontWeight: 500
              },
              backgroundColor: "#3366ff",
              spacing: {
                paddingTop: 12,
                paddingRight: 16,
                paddingBottom: 12,
                paddingLeft: 16
              },
              borderRadius: 8
            }
          }
        ]
      };

      const testWebData = {
        url: "test://example.com",
        styles: {
          selector: ".btn-primary",
          properties: {
            typography: {
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              fontWeight: 500
            },
            colors: {
              backgroundColor: "rgb(51, 102, 255)"
            },
            spacing: {
              paddingTop: 10,
              paddingRight: 16,
              paddingBottom: 10,
              paddingLeft: 16
            }
          }
        }
      };

      const config = {
        comparison: {
          thresholds: {
            fontSize: 2,
            spacing: 4,
            borderRadius: 2,
            colorTolerance: 5
          }
        },
        output: {
          reportDir: "./output/reports"
        }
      };

      const comparisonEngine = new ComparisonEngine(config);
      const reportGenerator = new ReportGenerator(config);

      spinner.text = 'Running comparison...';
      const comparisonReport = await comparisonEngine.compareDesigns(testFigmaData, testWebData);

      spinner.text = 'Generating report...';
      const reportPath = await reportGenerator.generateReport(comparisonReport, null, {
        title: 'Test Comparison Report',
        filename: 'test-report.html'
      });

      spinner.succeed('Test completed successfully!');

      console.log('\n' + chalk.bold('📊 Test Results:'));
      console.log(`Components: ${chalk.cyan(comparisonReport.comparisons.length)}`);
      console.log(`Deviations: ${chalk.red(comparisonReport.metadata.totalDeviations)}`);
      console.log(`Report: ${chalk.green(reportPath)}`);

    } catch (error) {
      spinner.fail('Test failed');
      console.error(chalk.red('❌ Error:'), error.message);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command. See --help for available commands.'));
  process.exit(1);
});

// Show help by default
if (process.argv.length === 2) {
  program.help();
}

program.parse();

export default program; 