const TOKEN =
  Deno.env.get("TELEGRAM_BOT_TOKEN")!;

export async function sendTelegramMessage(
  chatId: number | string,
  message: string,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}