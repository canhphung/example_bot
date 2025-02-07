const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs/promises');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Xem lịch sử 5 phiên Tài Xỉu gần nhất'),
  async execute(interaction) {
    try {
      const historyPath = path.join(__dirname, '../data/game_history.json');
      const data = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(data);

      const historyEmbed = new EmbedBuilder()
        .setTitle('📜 LỊCH SỬ 5 PHIÊN GẦN NHẤT')
        .setColor(0x6B8E23)
        .setDescription(
          history.slice(0, 5).map((game, idx) => 
            `**#${idx + 1}** 🎲 ${game.dice} » **${game.sum}** (${game.result})\n⏱️ ${game.time}`
          ).join('\n\n') || 'Chưa có lịch sử'
        );

      await interaction.reply({ embeds: [historyEmbed], ephemeral: true });
    } catch (error) {
      console.error('Lỗi đọc lịch sử:', error);
      await interaction.reply({ 
        content: '❌ Lỗi tải lịch sử!', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }
};