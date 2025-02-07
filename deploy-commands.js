const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  console.log(`Loading command file: ${file}`);
  try {
    const command = require(path.join(commandsPath, file));
    console.log(`Command data for ${file}:`, command.data); // Debugging line
    if (!command.data) {
      console.error(`Command file ${file} is missing the 'data' property.`);
      continue; // Skip this file
    }
    commands.push(command.data.toJSON());
  } catch (error) {
    console.error(`Error loading command file ${file}:`, error);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();