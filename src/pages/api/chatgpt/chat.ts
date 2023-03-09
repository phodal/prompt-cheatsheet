import { NextApiHandler } from "next";
import { getUserByUserId } from "./user";

import type { ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";
import { SITE_USER_COOKIE } from "@/configs/constants";

const handler: NextApiHandler = async (req, res) => {
  const userId = req.cookies[SITE_USER_COOKIE];
  if (!userId) {
    res.status(400).json({ error: "You're not logged in yet!" });
    return;
  }
  const user = getUserByUserId(userId);
  if (!user) {
    res.setHeader("Set-Cookie", `${SITE_USER_COOKIE}=; Max-Age=0; HttpOnly; Path=/;`);
    res.status(400).json({ error: "Your login session has been expired!" });
    return;
  }

  const { id, openai: client, conversations } = user;

  if (req.method === "POST" && req.body) {
    const { prompt, conversation_name } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (prompt && conversation_name) {
      const conversation = [
        ...(conversations.get(conversation_name) || []),
        {
          role: "user",
          content: prompt,
        } as ChatCompletionRequestMessage,
      ];
      try {
        const response = await client.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [...conversation],
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

        conversation.push(choices[0].message);
        conversations.set(conversation_name, conversation);
        return res.status(200).json({ messages: conversation });
      } catch (e: any) {
        let msg = "Some error happened";
        if (e.code === "ETIMEDOUT") {
          msg = "Request api was timeout, pls confirm your network worked";
        } else if (e.response && e.response.data) {
          msg = e.response.data.error;
        }
        res.status(500).json({ error: msg });
      }
    } else {
      res.status(400).json({ error: "Missing prompt or conversation_name" });
    }
  } else {
    res.status(404).json({ error: "Not found" });
  }
};
export default handler;
