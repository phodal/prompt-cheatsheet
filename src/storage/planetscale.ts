import { Kysely } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";
import { cache } from "react";

interface UsersTable {
  id: string;
  is_login: boolean;
  created_at: string;
}

interface ChatsTable {
  id: string;
  user_id: string;
  chat_name: string;
  // will be a JSON string: '[{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi" }]'
  chat_content: string;
  created_at: string;
}

interface Database {
  users: UsersTable;
  chats: ChatsTable;
}

export const queryBuilder = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    url: process.env.DATABASE_URL,
  }),
});

export const getAllChats = cache(async (userId: string) => {
  const data = await queryBuilder.selectFrom("chats").where("user_id", "=", userId).selectAll().execute();

  if (!data.length) {
    return null;
  }

  return data;
});

function generateDateTime() {
  const date = new Date();
  const padZero = (num: number) => num.toString().padStart(2, "0");

  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(
    date.getHours(),
  )}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

export const updateChatById = async (chatId: string, userId: string, chatContent: string, chatName: string) => {
  const datetime = generateDateTime();

  await queryBuilder
    .insertInto("chats")
    .values({ id: chatId, chat_name: chatName, user_id: userId, chat_content: chatContent, created_at: datetime })
    .onDuplicateKeyUpdate({ chat_content: chatContent })
    .execute();
};

export const saveAndLoginUser = async (userId: string) => {
  const datetime = generateDateTime();

  await queryBuilder
    .insertInto("users")
    .values({ id: userId, created_at: datetime, is_login: true })
    .onDuplicateKeyUpdate({ is_login: true })
    .execute();
};

export const getUserById = cache(async (userId: string) => {
  const data = await queryBuilder.selectFrom("users").where("id", "=", userId).selectAll().execute();

  if (!data.length) {
    return null;
  }

  return data[0];
});

export const logoutUser = async (userId: string) => {
  await queryBuilder.updateTable("users").where("id", "=", userId).set({ is_login: false }).execute();
};
