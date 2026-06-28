const fs = require('fs');
const path = require('path');

const testFiles = ['tests/search.test.js', 'tests/scheduler.test.js', 'tests/posts.test.js', 'tests/auth.test.js'];

for (const file of testFiles) {
    const fullPath = path.join(__dirname, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // add connectDB to beforeAll
    if (!content.includes('await connectDB()') && content.includes('beforeAll(async () => {')) {
        content = content.replace('beforeAll(async () => {', 'beforeAll(async () => {\n        await connectDB();');
    } else if (!content.includes('await connectDB()')) {
        // If there's no beforeAll, add it after describe
        content = content.replace(/describe\('.*?', \(\) => \{/, (match) => match + '\n    beforeAll(async () => { await connectDB(); });');
    }
    
    fs.writeFileSync(fullPath, content);
}
console.log('Fixed connections');
