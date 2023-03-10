import { NextApiHandler } from "next";

import type { ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";
import { Configuration, OpenAIApi } from "openai";
import { SITE_USER_COOKIE } from "@/configs/constants";
import { decrypt, secret } from "@/pages/api/chatgpt/user";
import { getAllChats, getUserById, updateChatById } from "@/storage/planetscale";

function createNewOpenAIApi(apiKey: string) {
  const configuration = new Configuration({
    apiKey,
  });

  return new OpenAIApi(configuration);
}

const chatClients = new Map<string, OpenAIApi>();

const handler: NextApiHandler = async (req, res) => {
  if (!secret) {
    res.status(500).json({
      error: "No secret key env in the server.",
    });
    return;
  }

  const userId = req.cookies[SITE_USER_COOKIE];
  if (!userId) {
    res.status(400).json({ error: "You're not logged in yet!" });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.setHeader("Set-Cookie", `${SITE_USER_COOKIE}=; Max-Age=0; HttpOnly; Path=/;`);
    res.status(400).json({ error: "Your login session has been expired!" });
    return;
  }

  const chatClient = chatClients.get(userId) || createNewOpenAIApi(decrypt(userId, secret));
  const chats = await getAllChats(userId);
  chatClients.set(userId, chatClient);

  if (req.method === "POST" && req.body) {
    const { prompt, chat_id: chatId, chat_name: chatName } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const currentChat = chats?.find((chat) => chat.id === chatId) ?? { chat_content: "[]" };
    const currentChatContent: ChatCompletionRequestMessage[] = JSON.parse(currentChat.chat_content);

    if (prompt && chatId) {
      const chat = [
        ...currentChatContent,
        {
          role: "user",
          content: prompt,
        } as ChatCompletionRequestMessage,
      ];
      try {
        const response = await chatClient.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [...chat],
          temperature: 0.5,
          max_tokens: 1024,
        });
        if (response.status !== 200) {
          res.status(response.status).json({ error: response.statusText });
          return;
        }
        const { choices } = response.data as CreateChatCompletionResponse;

        if (choices.length === 0 || !choices[0].message) {
          res.status(500).json({ error: "No response from OpenAI" });
          return;
        }

        chat.push(choices[0].message);
        const newChatContent = JSON.stringify(chat);
        await updateChatById(chatId, userId, newChatContent, chatName);

        return res.status(200).json({ messages: chat });
      } catch (e: any) {
        console.error(e);
        let msg = e.message;
        if (e.code === "ETIMEDOUT") {
          msg = "Request api was timeout, pls confirm your network worked";
        } else if (e.response && e.response.data) {
          msg = e.response.data.error;
        }
        res.status(500).json({ error: msg });
      }
    } else {
      res.status(400).json({ error: "Missing prompt or chat_id" });
    }
  } else {
    res.status(404).json({ error: "Not found" });
  }
};
export default handler;
