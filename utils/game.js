const { EmbedBuilder, ModalBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const User = require('../models/User');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

class Game {
  constructor(client, channelId, duration = 60000) {
    this.client = client;
    this.channelId = channelId;
    this.duration = duration;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.bets = [];
    this.status = 'open';
    this.message = null;
    this.countdownInterval = null;
    this.seed = crypto.randomBytes(16).toString('hex');
    
    this.initializeGame();
  }

  async initializeGame() {
    const channel = this.client.channels.cache.get(this.channelId);
    const embed = this.createEmbed();
    const components = this.createButtons();
    
    this.message = await channel.send({ embeds: [embed], components });
    this.startCountdown();
  }

  createEmbed() {
    const remainingSeconds = Math.ceil(Math.max(0, this.endTime - Date.now()) / 1000);
    return new EmbedBuilder()
      .setTitle('🎰 TÀI XỈU MINI GAME')
      .setColor(0x00FF00)
      .addFields(
        { name: '⏳ Thời gian', value: `\`${remainingSeconds} giây\``, inline: true },
        { name: '💰 Tổng cược', value: '`0 coins`', inline: true },
        { name: `🎮 Người chơi (${this.bets.length}/50)`, value: '```Chưa có cược```', inline: false }
      )
      .setFooter({ text: `🎲 uy tín xanh chín | Seed: ${this.seed}` });
  }

  createButtons() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bet_tai').setLabel('TÀI (11-18)').setStyle(ButtonStyle.Success).setEmoji('📈'),
        new ButtonBuilder().setCustomId('bet_xiu').setLabel('XỈU (4-10)').setStyle(ButtonStyle.Danger).setEmoji('📉')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('game_history').setLabel('Lịch sử 5 phiên').setStyle(ButtonStyle.Secondary).setEmoji('📜')
      )
    ];
  }

  async updateEmbed() {
    try {
      const embed = this.message.embeds[0];
      const totalBets = this.bets.reduce((sum, bet) => sum + bet.amount, 0);
      const remainingSeconds = Math.ceil(Math.max(0, this.endTime - Date.now()) / 1000);
      
      embed.data.fields[0].value = `\`${remainingSeconds} giây\``;
      embed.data.fields[1].value = `\`${totalBets.toLocaleString()} coins\``;
      embed.data.fields[2].name = `🎮 Người chơi (${this.bets.length}/50)`;
      embed.data.fields[2].value = this.bets.length > 0 
        ? this.bets.map(b => `• <@${b.userId}>: ${b.amount.toLocaleString()} ➡️ ${b.choice}`).join('\n') 
        : '```Chưa có cược```';
  
      await this.message.edit({ embeds: [embed] });
    } catch (error) {
      console.error('Lỗi khi cập nhật embed:', error);
    }
  }

  startCountdown() {
    this.countdownInterval = setInterval(async () => {
      const remaining = this.endTime - Date.now();
      
      try {
        if (remaining <= 0) {
          clearInterval(this.countdownInterval);
          this.status = 'closed';
          await this.resolveGame();
          return;
        }
        
        await this.updateEmbed();
      } catch (error) {
        console.error('Lỗi trong quá trình countdown:', error);
      }
    }, 1000);
  }

  generateDice() {
    const hash = crypto.createHash('sha256').update(this.seed).digest('hex');
    return Array.from({ length: 3 }, (_, i) => (parseInt(hash.substr(i * 8, 8), 16) % 6) + 1);
  }

  async createBetOptions(interaction, choice) {
    const user = await User.findOneAndUpdate(
      { userId: interaction.user.id },
      { $setOnInsert: { balance: 10000 } }, // Tạo mới user nếu không tồn tại
      { upsert: true, new: true }
    );
    const buttons = new ActionRowBuilder().addComponents(
      ['100', '300', '500', '1000', 'All'].map(amount => 
        new ButtonBuilder()
          .setCustomId(`bet_amount_${amount}_${choice}`)
          .setLabel(amount === 'All' ? 'ALL-IN' : amount)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎯')
      )
    );

    const modal = new ModalBuilder()
      .setCustomId(`bet_modal_${choice}`)
      .setTitle(`Đặt cược ${choice.toUpperCase()}`);

    const amountInput = new TextInputBuilder()
      .setCustomId('bet_amount')
      .setLabel(`Nhập số tiền (100 - ${user.balance.toLocaleString()})`)
      .setPlaceholder(`Ví dụ: 500, all, 1k, 2.5k`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    await interaction.showModal(modal);
  }

  async saveHistory(historyEntry) {
    try {
      const historyPath = path.join(__dirname, '../data/game_history.json');
      let history = [];

      try {
        const data = await fs.readFile(historyPath, 'utf-8');
        history = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      history.unshift(historyEntry);
      if (history.length > 5) history.length = 5;
      await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Lỗi lưu lịch sử:', error);
    }
  }

  async resolveGame() {
    await this.message.edit({ components: [] });
    await this.animateDice();

    const dice = this.generateDice();
    const sum = dice.reduce((a, b) => a + b, 0);
    const result = this.getResult(sum);
    
    console.log('Kết quả:', result);
    console.log('Danh sách cược:', this.bets);
  
    const processedBets = await Promise.all(this.bets.map(bet => this.processBet(bet, sum, result)));

    const historyEntry = this.createHistoryEntry(dice, sum, result);
    await this.saveHistory(historyEntry);
    
    const resultEmbed = this.createResultEmbed(processedBets, result, dice, historyEntry.time);
    await this.message.edit({ embeds: [resultEmbed], components: [] });
    this.client.games.delete(this.channelId);
  }

  getResult(sum) {
    if (sum >= 11 && sum <= 18) return 'tài';
    if (sum >= 4 && sum <= 10) return 'xỉu';
    return 'none';
  }

  async processBet(bet, sum, result) {
    const user = await User.findOne({ userId: bet.userId });
    const win = this.checkWin(bet, sum, result);
    
    if (win) {
        const winAmount = Math.floor(bet.amount * 1.98);
        user.balance += winAmount; // Thêm tiền thắng vào số dư
        await user.save();
        return { ...bet, win: true, payout: winAmount };
    }

    // Không trừ tiền cược nếu thua
    return { ...bet, win: false, payout: 0 }; // Trả về thông tin cược không hợp lệ
}

  checkWin(bet, sum, result) {
    if (['tài', 'xỉu'].includes(bet.choice)) {
      return bet.choice === result;
    }
    return parseInt(bet.choice) === sum;
  }

  createHistoryEntry(dice, sum, result) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    return {
      dice: this.getDiceIcons(dice),
      sum,
      result,
      time
    };
  }

  createResultEmbed(processedBets, result, dice, time) {
    return new EmbedBuilder()
      .setTitle(`🎲 KẾT QUẢ - ${result.toUpperCase()}`)
      .setColor(result === 'tài' ? 0x00FF00 : 0xFF0000)
      .setDescription(`${this.getDiceIcons(dice)} **(**\`${dice.reduce((a, b) => a + b, 0)}\`**)**`)
      .addFields(
        {
          name: '🏆 Người thắng',
          value: processedBets.filter(b => b.win).map(b => `<@${b.userId}>: +${b.payout.toLocaleString()}`).join('\n') || '```Không có```',
          inline: true
        },
        {
          name: '💔 Người thua',
          value: processedBets.filter(b => !b.win).map(b => `<@${b.userId}>: -${b.amount.toLocaleString()}`).join('\n') || '```Không có```',
          inline: true
        }
      )
      .setFooter({ text: `Seed: ${this.seed} | ${time}` });
  }

  async animateDice(duration = 1000) {
    let stopAnimation = false;
    
    const randomDice = () => Array.from({ length: 3 }, () => Math.floor(Math.random() * 6) + 1);
    const animation = setInterval(async () => {
      if (stopAnimation) return;
      const tempDice = randomDice();
      const tempEmbed = new EmbedBuilder()
        .setTitle("🎰 ĐANG LẮC XÚC XẮC...")
        .setDescription(this.getDiceIcons(tempDice))
        .setColor(0xFFA500);
      
      await this.message.edit({ embeds: [tempEmbed], components: [] });
    }, 100);

    setTimeout(() => {
      stopAnimation = true;
      clearInterval(animation);
    }, duration);
    
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  getDiceIcons(dice) {
    return dice.map(d => `**${['<:dice1:1336648287838670849>', '<:dice2:1336648322546405407>', '<:dice3:1336648467291967529>', '<:dice4:1336648512514949162>', '<:dice5:1336648635621965834>', '<:dice6:1336648663119695872>'][d - 1]}**`).join('  ');
  }
}

module.exports = Game;