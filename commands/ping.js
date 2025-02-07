const { SlashCommandBuilder } = require('discord.js');
const { getString } = require('../utils/languageManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction) {
    const userLanguage = 'en'; // Replace with logic to determine user's preferred language
    const greeting = getString(userLanguage, 'greeting', { username: interaction.user.username });

    await interaction.reply(greeting);
  },
};