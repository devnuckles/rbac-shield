const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const prompts = require('prompts');
const chalk = require('chalk');
const { getTemplate, TEMPLATES } = require('./templates');
const { 
  detectFramework, 
  isTypeScriptProject, 
  ensureDirectory, 
  fileExists,
  showNextSteps,
  detectPackageManager
} = require('./utils');

async function init() {
  console.log(chalk.cyan.bold('\n🔐 RBAC Shield - Interactive Setup'));
  console.log(chalk.cyan('━'.repeat(40)) + '\n');

  // Detect package manager
  const pm = detectPackageManager();
  console.log(chalk.blue(`ℹ Using package manager: ${pm}`));

  // Detect project type
  const framework = detectFramework();
  const hasTypeScript = isTypeScriptProject();

  if (framework) {
    console.log(chalk.green(`✓ Detected ${framework} project\n`));
  }

  // Check if rbac-shield is already installed in package.json
  let isInstalled = false;
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (allDeps['rbac-shield']) {
      isInstalled = true;
    }
  } catch (e) {
    // If no package.json or error, assume not installed
    isInstalled = false;
  }

  // Prompt for language
  const { language } = await prompts({
    type: 'select',
    name: 'language',
    message: 'Use TypeScript or JavaScript?',
    choices: [
      { title: 'TypeScript', value: 'typescript', selected: hasTypeScript },
      { title: 'JavaScript', value: 'javascript' }
    ],
    initial: hasTypeScript ? 0 : 1
  });

  if (!language) {
    console.log(chalk.yellow('\n✖ Setup cancelled'));
    process.exit(0);
  }

  // Prompt for template
  const { template } = await prompts({
    type: 'select',
    name: 'template',
    message: 'Choose a template:',
    choices: [
      { 
        title: 'Basic (projects, users, settings)', 
        value: 'basic',
        description: 'General purpose RBAC setup'
      },
      { 
        title: 'E-commerce (products, orders, customers)', 
        value: 'ecommerce',
        description: 'For online stores and marketplaces'
      },
      { 
        title: 'SaaS (workspaces, billing, teams)', 
        value: 'saas',
        description: 'For multi-tenant SaaS applications'
      },
      { 
        title: 'Custom (define your own)', 
        value: 'custom',
        description: 'Specify your own resources and actions'
      }
    ],
    initial: 0
  });

  if (!template) {
    console.log(chalk.yellow('\n✖ Setup cancelled'));
    process.exit(0);
  }

  let resources, actions;

  if (template === 'custom') {
    // Prompt for custom resources and actions
    const customConfig = await prompts([
      {
        type: 'text',
        name: 'resources',
        message: 'Enter resource types (comma-separated):',
        initial: 'projects, users, settings',
        validate: value => value.trim().length > 0 || 'Please enter at least one resource'
      },
      {
        type: 'text',
        name: 'actions',
        message: 'Enter action types (comma-separated):',
        initial: 'view, create, edit, delete',
        validate: value => value.trim().length > 0 || 'Please enter at least one action'
      }
    ]);

    if (!customConfig.resources || !customConfig.actions) {
      console.log(chalk.yellow('\n✖ Setup cancelled'));
      process.exit(0);
    }

    resources = customConfig.resources.split(',').map(r => r.trim()).filter(Boolean);
    actions = customConfig.actions.split(',').map(a => a.trim()).filter(Boolean);
  } else {
    const templateData = TEMPLATES[template];
    resources = templateData.resources;
    actions = templateData.actions;

    // Confirm template
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Use resources: ${resources.join(', ')} and actions: ${actions.join(', ')}?`,
      initial: true
    });

    if (!confirmed) {
      console.log(chalk.yellow('\n✖ Setup cancelled'));
      process.exit(0);
    }
  }

  console.log('');

  // Install rbac-shield if not installed
  if (!isInstalled) {
    console.log(chalk.blue('📦 Installing rbac-shield...'));
    try {
      const installCmd = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn add' : pm === 'pnpm' ? 'pnpm add' : 'bun add';
      execSync(`${installCmd} rbac-shield@latest`, { stdio: 'inherit' });
      console.log(chalk.green('✓ rbac-shield installed\n'));
    } catch (error) {
      console.error(chalk.red('✖ Failed to install rbac-shield'));
      console.error(chalk.yellow(`Please install manually: ${pm} add rbac-shield`));
      process.exit(1);
    }
  }

  // Create lib directory
  const libDir = path.join(process.cwd(), 'lib');
  ensureDirectory(libDir);

  // Generate config file
  const ext = language === 'typescript' ? 'ts' : 'js';
  const configPath = path.join(libDir, `rbac.${ext}`);

  if (fileExists(configPath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `${configPath} already exists. Overwrite?`,
      initial: false
    });

    if (!overwrite) {
      console.log(chalk.yellow('\n✖ Setup cancelled'));
      process.exit(0);
    }
  }

  const configContent = getTemplate(template, language, resources, actions);
  fs.writeFileSync(configPath, configContent, 'utf8');

  console.log(chalk.green(`✓ Created lib/rbac.${ext}`));
  console.log(chalk.green('✓ Setup complete!\n'));

  // Show next steps
  showNextSteps(framework, language, pm);
}

module.exports = init;
