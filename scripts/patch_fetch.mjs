import fs from 'fs';

const files = [
    'src/pages/QuotesPage.tsx',
    'src/pages/Dashboard.tsx',
    'src/pages/AdminSettings.tsx',
    'src/pages/AdminDashboardPage.tsx',
    'src/pages/AdminCatalog.tsx',
    'src/modules/smart-assistant/SystemRecommendation.tsx',
    'src/modules/smart-assistant/RegionSelector.tsx',
    'src/modules/smart-assistant/QuickAmperStep.tsx',
    'src/modules/smart-assistant/ApplianceLibrary.tsx',
    'src/store/amperQuoteStore.ts'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('import { apiFetch }')) continue;

    // In Javascript regex, (?<!\w|\.) means not preceded by a word char or dot
    content = content.replace(/(?<![\w\.])fetch\(/g, 'apiFetch(');

    content = `import { apiFetch } from '@/src/utils/apiFetch';\n` + content;
    fs.writeFileSync(file, content);
}
console.log('Successfully patched all fetch calls to apiFetch!');
