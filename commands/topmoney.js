const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topmoney')
    .setDescription('Bảng xếp hạng tiền của server'),
  async execute(interaction) {
    try {
      const users = await User.find({ userId: { $ne: null } })
        .sort({ balance: -1 })
        .limit(10);

      const embed = new EmbedBuilder()
        .setTitle('Bảng Xếp Hạng Tiền')
        .setColor(0x00FF00)
        .setDescription('Dưới đây là bảng xếp hạng tiền của server:');

      let index = 1;
      for (const user of users) {
        const member = interaction.guild.members.cache.get(user.userId);
        if (member && !member.user.bot) {
          embed.addFields({
            name: `#${index} ${member.user.username}`,
            value: `Số tiền: ${user.balance.toLocaleString()} coins`,
            inline: false,
          });
          index++;
        }
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Lỗi lấy dữ liệu bảng xếp hạng:', error);
      await interaction.reply({
        content: '❌ Lỗi lấy dữ liệu bảng xếp hạng!',
        ephemeral: true,
      });
    }
  },
};