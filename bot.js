const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User'); // Import model User

require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.games = new Map();
client.gameHistory = new Map();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Kết nối đến MongoDB thành công!');
    initialize();
  })
  .catch(err => {
    console.error('Lỗi kết nối đến MongoDB:', err);
  });

// Khởi tạo thư mục data
async function initialize() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dataDir);
      console.log('Đã tạo thư mục data');
    }
  }

  // Hiển thị thông tin bot
  console.log('Bot đã khởi động thành công!');
  console.log(`ID máy chủ: ${process.env.GUILD_ID}`);
  console.log(`ID client: ${process.env.CLIENT_ID}`);
  console.log('Đang lắng nghe các lệnh...');

  // Lắng nghe command từ console
  process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    const args = input.split(' ');

    if (args[0] === 'addmoney' && args.length === 3) {
      const userId = args[1];
      const amount = parseInt(args[2], 10);

      if (isNaN(amount) || amount <= 0) {
        console.log('Số tiền phải là một số dương.');
        return;
      }

      await addMoney(userId, amount);
    } else {
      console.log('Sử dụng: addmoney <userId> <amount>');
    }
  });
}

// Hàm cộng tiền cho user
async function addMoney(userId, amount) {
  try {
    const user = await User.findOneAndUpdate(
      { userId: userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    );

    console.log(`Đã cộng ${amount} coins cho user ${userId}. Số dư mới: ${user.balance.toLocaleString()} coins`);
  } catch (error) {
    console.error('Lỗi khi cộng tiền:', error);
  }
}

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login to Discord
client.login(process.env.TOKEN);