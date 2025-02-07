const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stolen')
    .setDescription('Ăn trộm tiền của một người ngẫu nhiên'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = await User.findOne({ userId });

    // Kiểm tra xem người dùng đã sử dụng lệnh này trong ngày chưa
    const today = new Date().toISOString().split('T')[0];
    if (user.lastStolenDate === today) {
      return interaction.reply({
        content: '❌ Bạn chỉ có thể ăn trộm một lần mỗi ngày!',
        ephemeral: true,
      });
    }

    // Lấy danh sách người dùng khác để ăn trộm
    const otherUsers = await User.find({ userId: { $ne: userId } });
    if (otherUsers.length === 0) {
      return interaction.reply({
        content: '❌ Không có người dùng nào để ăn trộm!',
        ephemeral: true,
      });
    }

    // Chọn ngẫu nhiên một người dùng để ăn trộm
    const targetUser  = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    const stolenPercentage = [0.01, 0.05, 0.1];
    const percentage = stolenPercentage[Math.floor(Math.random() * stolenPercentage.length)];
    const stolenAmount = Math.floor(targetUser .balance * percentage);

    // Cập nhật số dư
    user.balance += stolenAmount;
    targetUser .balance -= stolenAmount;

    // Cập nhật ngày sử dụng lệnh
    user.lastStolenDate = today;

    await user.save();
    await targetUser .save();

    await interaction.reply({
      content: `✅ Bạn đã ăn trộm **${stolenAmount.toLocaleString()} coins** từ <@${targetUser .userId}>!`,
    });
  },
};