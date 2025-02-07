const User = require('../models/User');

async function addMoney(userId, amount) {
  try {
    const user = await User.findOneAndUpdate(
      { userId: userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    );

    console.log(`Đã cộng ${amount} coins cho user ${userId}. Số dư mới: ${user.balance.toLocaleString()} coins`);
    const userToNotify = await interaction.client.users.fetch(userId);
    await userToNotify.send({
      content: `🎉 Bạn đã được cộng **${amount.toLocaleString()} coins**! Số dư hiện tại: **${user.balance.toLocaleString()} coins**.`,
    });
  } catch (error) {
    console.error('Lỗi khi cộng tiền:', error);
  }
}

// Lấy tham số từ command line
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Sử dụng: node addMoney.js <userId> <amount>');
  process.exit(1);
}

const userId = args[0];
const amount = parseInt(args[1], 10);

if (isNaN(amount) || amount <= 0) {
  console.log('Số tiền phải là một số dương.');
  process.exit(1);
}

//addMoney(userId, amount);
addMoney(userId, amount, { client: { users: { fetch: async (id) => ({ send: async (msg) => console.log(`Sent to ${id}: ${msg.content}`) }) } } });