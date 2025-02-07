const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chuyentien')
    .setDescription('Chuyển tiền cho người khác')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người nhận tiền')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số tiền cần chuyển')
        .setRequired(true)
        .setMinValue(100)
    ),
    async execute(interaction) {
      const sender = interaction.user;
      const receiver = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
    
      // Kiểm tra điều kiện cơ bản
      if (sender.id === receiver.id) {
        return interaction.reply({ content: '❌ Không thể tự chuyển tiền!', ephemeral: true });
      }
    
      if (receiver.bot) {
        return interaction.reply({ content: '❌ Không thể chuyển cho bot!', ephemeral: true });
      }
    
      const session = await User.startSession();
      
      try {
        session.startTransaction();
        
        // Kiểm tra số dư TRƯỚC khi cập nhật
        const senderAccount = await User.findOne({ userId: sender.id }).session(session);
        if (!senderAccount || senderAccount.balance < amount) {
          await session.abortTransaction();
          return interaction.reply({
            content: `❌ Số dư không đủ! Bạn còn ${senderAccount?.balance?.toLocaleString() || 0} coins`,
            ephemeral: true
          });
        }
    
        // Thực hiện cập nhật
        await User.updateOne(
          { userId: sender.id },
          { $inc: { balance: -amount } },
          { session }
        );
    
        await User.updateOne(
          { userId: receiver.id },
          { $inc: { balance: amount } },
          { upsert: true, session }
        );
    
        await session.commitTransaction();
    
        // Phản hồi thành công
        const embed = new EmbedBuilder()
          .setTitle('💸 CHUYỂN TIỀN THÀNH CÔNG')
          .setColor(0x00FF00)
          .addFields(
            { name: 'Người gửi', value: `<@${sender.id}>`, inline: true },
            { name: 'Người nhận', value: `<@${receiver.id}>`, inline: true },
            { name: 'Số tiền', value: `${amount.toLocaleString()} coins`, inline: false }
          );
        
        await interaction.reply({ embeds: [embed] });
    
      } catch (error) {
        await session.abortTransaction();
        console.error('Lỗi chuyển tiền:', error);
        await interaction.reply({
          content: '❌ Lỗi hệ thống khi chuyển tiền!',
          ephemeral: true
        });
      } finally {
        session.endSession();
      }
    }
};