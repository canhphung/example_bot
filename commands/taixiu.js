const { SlashCommandBuilder } = require('discord.js');
const Game = require('../utils/game');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taixiu')
    .setDescription('Bắt đầu phiên Tài Xỉu mới'),
  async execute(interaction) {
    // Kiểm tra game hiện có
    if (interaction.client.games.has(interaction.channelId)) {
      return interaction.reply({ 
        content: '⚠️ Đang có phiên hoạt động trong kênh này!',
        ephemeral: true
      });
    }

    try {
      // Khởi tạo game
      const game = new Game(interaction.client, interaction.channelId);
      interaction.client.games.set(interaction.channelId, game);
      
      await interaction.reply({ 
        content: '🎉 Phiên Tài Xỉu đã khởi động!', 
        ephemeral: true 
      });

    } catch (error) {
      console.error('Lỗi khởi tạo game:', error);
      await interaction.reply({ 
        content: '❌ Lỗi khởi tạo phiên!', 
        ephemeral: true 
      });
    }
  }
};

// Hàm xử lý cược
async function handleBetting(interaction, game, choice, amount) {
  const user = await User.findOne({ userId: interaction.user.id });

  // Kiểm tra số dư trước khi đặt cược
  if (user.balance < amount) {
    return interaction.reply({
      content: '❌ Bạn không đủ số dư để đặt cược!',
      ephemeral: true
    });
  }

  // Tiến hành đặt cược
  if (game.bets.some(b => b.userId === interaction.user.id)) {
    return interaction.reply({
      content: 'Mỗi người chỉ được cược 1 lần!',
      ephemeral: true
    });
  }

  game.bets.push({
    userId: interaction.user.id,
    amount: amount,
    choice: choice === 'tai' ? 'tài' : 'xỉu'
  });

  await game.updateEmbed();
  
  // Trừ tiền cược ngay lập tức
  user.balance -= amount;
  await user.save();

  return interaction.reply({
    content: `✅ Đã đặt **${amount.toLocaleString()} coins** vào **${choice.toUpperCase()}**!`,
    ephemeral: true
  });
}

// Hàm xử lý kết quả cược
async function processBet(bet, sum, result) {
  const user = await User.findOne({ userId: bet.userId });
  const win = checkWin(bet, sum, result);
  
  if (win) {
    const winAmount = Math.floor(bet.amount * 1.98);
    user.balance += winAmount;
    await user.save();
    return { ...bet, win: true, payout: winAmount };
  }

  // Kiểm tra số dư trước khi trừ tiền
  if (user.balance < bet.amount) {
    console.error(`Người dùng ${bet.userId} không đủ số dư để cược ${bet.amount}. Số dư hiện tại: ${user.balance}`);
    return { ...bet, win: false, payout: -bet.amount }; // Trả về thông tin cược không hợp lệ
  }

  user.balance -= bet.amount;
  await user.save();
  return { ...bet, win: false, payout: -bet.amount };
}

// Hàm kiểm tra kết quả cược
function checkWin(bet, sum, result) {
  if (['tài', 'xỉu'].includes(bet.choice)) {
    return bet.choice === result;
  }
  return parseInt(bet.choice) === sum;
}