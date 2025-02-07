const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Load all language files
const localesPath = path.join(__dirname, '../locales');
const languageFiles = fs.readdirSync(localesPath);

const languages = {};

languageFiles.forEach((file) => {
  const languageCode = file.split('.')[0]; // Extract language code (e.g., 'en' from 'en.yml')
  const filePath = path.join(localesPath, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  languages[languageCode] = yaml.parse(fileContent);
});

// Function to get a translated string
function getString(lang, key, variables = {}) {
  const strings = languages[lang];
  if (!strings) throw new Error(`Language '${lang}' not found.`);

  let string = strings[key];
  if (!string) throw new Error(`Key '${key}' not found in language '${lang}'.`);

  // Replace placeholders with variables
  for (const [varName, value] of Object.entries(variables)) {
    string = string.replace(new RegExp(`{${varName}}`, 'g'), value);
  }

  return string;
}

module.exports = { getString };