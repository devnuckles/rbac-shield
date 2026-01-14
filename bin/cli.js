#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

program
  .name('rbac-shield')
  .description('Interactive CLI for RBAC Shield setup')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize RBAC Shield in your project')
  .action(async () => {
    try {
      const init = require('./init');
      await init();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
