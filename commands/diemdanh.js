const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diemdanh')
    .setDescription('Điểm danh nhận quà hàng ngày'),
  async execute(interaction) {
    try {
      const user = await User.findOneAndUpdate(
        { userId: interaction.user.id },
        { $setOnInsert: { balance: 10000 } },
        { upsert: true, new: true }
      );

      // Kiểm tra đã điểm danh trong ngày chưa
      const today = new Date().toISOString().split('T')[0];
      if (user.lastCheckinDate === today) {
        return interaction.reply({
          content: '❌ Bạn đã điểm danh hôm nay rồi!',
          ephemeral: true
        });
      }

      // Random số tiền từ 10k đến 100k
      const amount = Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;

      // Cập nhật số dư và ngày điểm danh
      user.balance += amount;
      user.lastCheckinDate = today;
      await user.save();

      // Tạo embed thông báo
      const embed = new EmbedBuilder()
        .setTitle('🎉 ĐIỂM DANH THÀNH CÔNG')
        .setColor(0xFFD700)
        .addFields(
          { name: 'Số tiền nhận được', value: `${amount.toLocaleString()} coins`, inline: true },
          { name: 'Tổng số dư', value: `${user.balance.toLocaleString()} coins`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Hãy quay lại vào ngày mai nhé!' });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Lỗi lệnh điểm danh:', error);
      await interaction.reply({
        content: '❌ Có lỗi xảy ra khi điểm danh!',
        ephemeral: true
      });
    }
  }
};