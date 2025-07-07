async function handleEmailCheck(ctx, email) {
  try {
    const checker = new EmailChecker();
    const message = await ctx.reply(`🔍 Checking email: ${email}\nPlease wait...`);
    
    // Start checking services
    const results = await checker.checkEmail(email);

    // Format final results message
    let responseText = `📧 *Email Check Results*\n`;
    responseText += `Email: \`${email}\`\n\n`;

    if (results.length > 0) {
      responseText += `✅ *Found ${results.length} registered accounts:*\n\n`;
      results.forEach(account => {
        responseText += `*${account.service}*\n`;
        responseText += `└ Domain: ${account.domain}\n`;
        responseText += `└ Method: ${account.method}\n\n`;
      });
    } else {
      responseText += `❌ No registered accounts found\n`;
    }

    responseText += `\n⚠️ Note: Some services might be rate-limited`;

    // Update final message
    await ctx.telegram.editMessageText(
      message.chat.id,
      message.message_id,
      null,
      responseText,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Email check error:', error);
    await ctx.reply('❌ Error occurred while checking email. Please try again later.');
  }
}

module.exports = handleEmailCheck;