const fs = require('fs');
const { readFile, writeFile } = fs.promises;

// Option 1: Using async/await (recommended)
async function loadJsonData() {
    try {
        const data = await readFile('./A1-thru-I10.json', 'utf8');
        const api_data = JSON.parse(data);
        console.log('Option 1 (Async):', api_data.values[0]); // Access the values array
        return api_data;
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

// Call the async function
loadJsonData();

// Option 2: Synchronous (blocks execution)
const data = fs.readFileSync('./A1-thru-I10.json', 'utf-8');
const jsonData = JSON.parse(data);
console.log('Option 2 (Sync):', jsonData.values[0]); // Access the values array

// Option 3: Using `require()` for JSON (simplest for static files)
const jsonDataStaticMethod = require('./A1-thru-I10.json');
console.log('Option 3 (Require):', jsonDataStaticMethod.values[0]); // Access the values array