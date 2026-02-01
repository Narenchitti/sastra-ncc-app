const XLSX = require('xlsx');

const workbook = XLSX.readFile('data/raw_import.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', data[0]);
console.log('First Row:', data[1]);
