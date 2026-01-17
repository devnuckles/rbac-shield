const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function detectFramework() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.next) {
      return 'Next.js';
    }
    if (deps.react) {
      return 'React';
    }

    return null;
  } catch (error) {
    return null;
  }
}

function isTypeScriptProject() {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  return fs.existsSync(tsconfigPath);
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
    if (userAgent.startsWith('npm')) return 'npm';
  }

  // Fallback to lock files
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(process.cwd(), 'bun.lockb'))) return 'bun';
  
  return 'npm';
}

function showNextSteps(framework, language, packageManager = 'npm') {
  const ext = language === 'typescript' ? 'ts' : 'js';
  const importExt = language === 'typescript' ? 'tsx' : 'jsx';

  console.log(chalk.cyan('━'.repeat(40)));
  console.log(chalk.bold('\n📚 Next Steps:\n'));

  if (framework === 'Next.js') {
    console.log(chalk.white('1. Add RBACProvider & PermissionLoader to your app/layout.' + importExt + ':\n'));
    console.log(chalk.gray(`   import { RBACProvider } from '@/lib/rbac';
   import { PermissionLoader } from '@/components/PermissionLoader';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <RBACProvider>
             <PermissionLoader>
               {children}
             </PermissionLoader>
           </RBACProvider>
         </body>
       </html>
     );
    }\n`));

    console.log(chalk.white('2. Initialize permissions (create a component):\n'));
    console.log(chalk.gray(`   'use client';
   import { useEffect } from 'react';
   import { useRBAC } from '@/lib/rbac';
   
   export function PermissionLoader({ children }) {
     const { setAuth, switchTenant } = useRBAC();
     
     useEffect(() => {
       // Fetch from your API
       setAuth([
         { 
           tenantId: 'org_1', 
           roles: ['admin'], 
           permissions: ['projects:view', 'users:view'] 
         }
       ]);
       switchTenant('org_1');
     }, []);
     
     return <>{children}</>;
   }\n`));

    console.log(chalk.white('3. Use permissions in your components:\n'));
    console.log(chalk.gray(`   import { Can, useHasPermission, ProtectedRoute } from '@/lib/rbac';
   
   export default function MyPage() {
     const canEdit = useHasPermission('projects:edit');
     
     return (
       <ProtectedRoute permission="projects:view">
         <h1>Projects</h1>
         <Can permission="projects:delete">
           <button>Delete</button>
         </Can>
         {canEdit && <button>Edit</button>}
       </ProtectedRoute>
     );
   }\n`));
  } else {
    console.log(chalk.white('1. Wrap your app with RBACProvider\n'));
    console.log(chalk.white('2. Initialize permissions with setAuth()\n'));
    console.log(chalk.white('3. Use Can, useHasPermission, and ProtectedRoute\n'));
  }

  console.log(chalk.cyan('━'.repeat(40)));
  console.log(chalk.blue('\n📖 Documentation: ') + chalk.underline('https://npmjs.com/package/rbac-shield'));
  console.log(chalk.green('\n✨ Happy coding!\n'));
}

module.exports = {
  detectFramework,
  isTypeScriptProject,
  ensureDirectory,
  fileExists,
  showNextSteps,
  detectPackageManager
};

