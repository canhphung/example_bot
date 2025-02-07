const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete all messages in the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Restrict to users with MANAGE_MESSAGES permission
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of messages to delete (default: 100)')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Check if the user has the MANAGE_MESSAGES permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Get the limit (default to 100 if not provided)
    const limit = interaction.options.getInteger('limit') || 100;

    // Defer the reply to avoid timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;

    try {
      let deletedCount = 0;
      let messages;

      // Fetch and delete messages in batches
      do {
        // Fetch messages (up to 100 at a time, as per Discord's API limit)
        messages = await channel.messages.fetch({ limit: 100 });

        // If no messages are left, break the loop
        if (messages.size === 0) break;

        // Delete the fetched messages
        await channel.bulkDelete(messages);
        deletedCount += messages.size;

        // Stop if the requested limit is reached
        if (deletedCount >= limit) break;
      } while (messages.size > 0);

      // Send a confirmation message
      await interaction.followUp({
        content: `Successfully deleted ${deletedCount} messages.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error deleting messages:', error);
      await interaction.followUp({
        content: 'An error occurred while deleting messages.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};