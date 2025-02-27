"use client"

import { useEffect, useState } from "react";

import Menu from "@/app/components/Menu";
import ChatUI from "@/app/components/ChatUI";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [mode, setMode] = useState("textqa");
  const [user, setUser] = useState({
    isLogin: false,
    username: ""
  })
  const [messages, setMessages] = useState([
    { text: "สวัสดี วันนี้ฉันจะช่วยเหลือคุณได้อย่างไร?", sender: "bot" },
  ]);

  const router = useRouter()


  useEffect(() => {
    const checkLogin = async () => {
      const token = localStorage.getItem("token")
        if(!token && !user.isLogin){
          router.push('/auth/login')
        }
        const response = await axios.get(`${API_URL}/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        if(response.data.status){
          setUser({
            isLogin: true,
            username: response.data.username
          })
        }
    }
    checkLogin()
  }, [])

  return (
    <div className="flex">
      <Menu mode={mode} setMode={setMode} messages={messages} setMessages={setMessages} setUser={setUser}/>
      <ChatUI mode={mode} setMode={setMode} messages={messages} setMessages={setMessages}/>
    </div>
  );
}
