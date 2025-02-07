const { EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

// Utility function to format currency
const formatCoins = (amount) => amount.toLocaleString();

// Utility function to handle errors
const handleError = async (interaction, message, error) => {
  console.error(message, error);
  const response = { content: '❌ ' + message, flags: MessageFlags.Ephemeral };
  if (interaction.deferred) {
    await interaction.editReply(response);
  } else {
    await interaction.reply(response);
  }
};

// Handle command interactions
async function handleCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    await handleError(interaction, 'Lỗi thực thi lệnh!', error);
  }
}

// Handle game history button
async function handleGameHistory(interaction, client) {
  const history = client.gameHistory?.get(interaction.channelId) || [];
  const historyEmbed = new EmbedBuilder()
    .setTitle('📜 LỊCH SỬ 5 PHIÊN GẦN NHẤT')
    .setColor(0x6B8E23)
    .setDescription(
      history.slice(-5).reverse().map((game, idx) => 
        `**#${idx + 1}** ${game.dice} » **${game.sum}** (${game.result})\n⏱️ ${game.time}`
      ).join('\n\n') || 'Chưa có lịch sử'
    );
  
  return interaction.reply({ 
    embeds: [historyEmbed], 
    flags: MessageFlags.Ephemeral 
  });
}

// Process bet amount
async function processBetAmount(input, user) {
    if (typeof input === 'string' && input.toLowerCase().match(/^(all|max)$/)) {
        return user.balance;
      }
      
      if (typeof input === 'string') {
        const numberValue = input.toLowerCase().replace(/[^0-9k]/g, ''); // Loại bỏ kí tự lạ nhưng giữ 'k'
        
        if (numberValue.includes('k')) {
          return Math.round(parseFloat(numberValue.replace('k', '')) * 1000) || 0;
        }
    
        return Math.round(parseFloat(numberValue)) || 0;
      }
      
      return parseInt(input);
    }
// Validate bet amount
function validateBetAmount(amount, userBalance) {
  if (isNaN(amount) || amount < 100) {
    throw new Error('Số tiền tối thiểu là 100 coins!');
  }
  
  if (amount > userBalance) {
    throw new Error(`Bạn chỉ có ${formatCoins(userBalance)} coins!`);
  }
  
  return amount;
}

// Handle betting process
async function handleBetting(interaction, game, choice, amount) {
  if (game.bets.some(b => b.userId === interaction.user.id)) {
    return 'Mỗi người chỉ được cược 1 lần!';
  }

  game.bets.push({
    userId: interaction.user.id,
    amount: amount,
    choice: choice === 'tai' ? 'tài' : 'xỉu'
  });

  await game.updateEmbed();
  
  return `✅ Đã đặt **${formatCoins(amount)} coins** vào **${choice.toUpperCase()}**!`;
}

// Handle modal submit
async function handleModalSubmit(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  
  const [_, choice] = interaction.customId.split('_').slice(1);
  const game = client.games.get(interaction.channelId);
  
  if (!game || game.status !== 'open') {
    throw new Error('Phiên cược đã kết thúc!');
  }

  const user = await User.findOne({ userId: interaction.user.id });
  const input = interaction.fields.getTextInputValue('bet_amount');
  
  const amount = await processBetAmount(input, user);
  validateBetAmount(amount, user.balance);

  // Trừ tiền cược ngay lập tức
  user.balance -= amount;
  await user.save();
  
  const message = await handleBetting(interaction, game, choice, amount);
  await interaction.followUp({
    content: message,
    ephemeral: true
  });
}

// Main event handler
module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // Handle different types of interactions
      if (interaction.isCommand()) {
        await handleCommand(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        // Handle game history button
        if (interaction.customId === 'game_history') {
          await handleGameHistory(interaction, client);
          return;
        }

        // Get current game
        const game = client.games.get(interaction.channelId);
        if (!game || game.status !== 'open') {
          await interaction.reply({ 
            content: '⏳ Phiên đã kết thúc!', 
            flags: MessageFlags.Ephemeral 
          });
          return;
        }

        // Process button interaction
        const [type, amount, choice] = interaction.customId.split('_').slice(1);

        if (type === 'tai' || type === 'xiu') {
            if (game.bets.some(b => b.userId === interaction.user.id)) {
                await interaction.reply({
                  content: ':x: Mỗi người chỉ được cược 1 lần!',
                  flags: MessageFlags.Ephemeral
                });
                return;
              }
          await game.createBetOptions(interaction, type);
          return;
        }

        if (type === 'amount') {
          const user = await User.findOneAndUpdate(
            { userId: interaction.user.id },
            { $setOnInsert: { balance: 10000 } },
            { upsert: true, new: true }
          );

          const amountValue = await processBetAmount(amount, user);
          validateBetAmount(amountValue, user.balance);
          
          const message = await handleBetting(interaction, game, choice, amountValue);
          await interaction.followUp({
            content: message,
            flags: MessageFlags.Ephemeral 
          });
        }
      }
    } catch (error) {
      await handleError(interaction, error.message || 'Lỗi hệ thống!', error);
    }
  }
};
