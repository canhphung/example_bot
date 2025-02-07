const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem hồ sơ của bạn hoặc người khác')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('Người dùng cần xem hồ sơ')
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      // Lấy người dùng mục tiêu (target) hoặc chính người gọi lệnh
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Kiểm tra nếu target là bot
      if (targetUser.bot) {
        return interaction.reply({
          content: '❌ Không thể xem hồ sơ của bot!',
          ephemeral: true
        });
      }

      // Tìm hoặc tạo người dùng trong database
      const userData = await User.findOneAndUpdate(
        { userId: targetUser.id },
        { $setOnInsert: { balance: 10000 } },
        { upsert: true, new: true }
      );

      // Tạo embed
      const profileEmbed = new EmbedBuilder()
        .setTitle(`📁 HỒ SƠ • ${targetUser.username}`)
        .setColor('#00BFFF')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { 
            name: '💰 Số dư', 
            value: `\`${userData.balance.toLocaleString()} coins\``, 
            inline: true 
          },
          { 
            name: '📅 Tham gia', 
            value: `<t:${Math.floor(userData.createdAt.getTime() / 1000)}:R>`, 
            inline: true 
          }
        )
        .setFooter({ text: `ID: ${targetUser.id}` });

      await interaction.reply({ 
        embeds: [profileEmbed],
        ephemeral: true 
      });

    } catch (error) {
      console.error('Lỗi lệnh profile:', error);
      await interaction.reply({
        content: '❌ Đã xảy ra lỗi khi tải hồ sơ!',
        ephemeral: true
      });
    }
  }
};