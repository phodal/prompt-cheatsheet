import { ChatRoom } from "@/chatgpt/ChatRoom";
import { LoginPage } from "@/chatgpt/LoginPage";
import React, { useEffect, useState } from "react";
import { SharedApi } from "@/types/shared";

interface ChatGPTAppProps extends Omit<SharedApi, "isLoggedInApi"> {
  loggedIn?: boolean;
  updateLoginStatus?: (loggedIn: boolean) => void;
  initMessage?: string;
};
export const ChatGPTApp = ({
  loggedIn,
  initMessage,
  updateLoginStatus,
  changeConversationNameApi,
  createConversationApi,
  getChatsByConversationIdApi,
  deleteConversationApi,
  deleteAllConversationsApi,
  sendMsgWithStreamResApi,
  logoutApi,
}: ChatGPTAppProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(loggedIn ?? false);

  useEffect(() => {
    if (updateLoginStatus) {
      updateLoginStatus(isLoggedIn);
    }
  }, [isLoggedIn]);

  return isLoggedIn ? (
    <ChatRoom
      setIsLoggedIn={setIsLoggedIn}
      initMessage={initMessage}
      changeConversationNameApi={changeConversationNameApi}
      createConversationApi={createConversationApi}
      getChatsByConversationIdApi={getChatsByConversationIdApi}
      deleteConversationApi={deleteConversationApi}
      deleteAllConversationsApi={deleteAllConversationsApi}
      sendMsgWithStreamResApi={sendMsgWithStreamResApi}
      logoutApi={logoutApi}
    />
  ) : (
    <LoginPage
      setIsLoggedIn={setIsLoggedIn}
      loginApi={function (key: string): Promise<any> {
        throw new Error("Function not implemented.");
      }}
    />
  );
};
