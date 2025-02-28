"use client"
import { Label } from "@/components/ui/label";
import { SelectGroup, SelectItem, SelectLabel } from "@/components/ui/select";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { LogInIcon, MessageCircle, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export const model = {
  ทั่วไป: {
    ถามตอบ: "textqa",
    ตัดคำ: "tokenize",
    วิเคราะห์ความคิดเห็น: "ssense",
    ทำนายอารมณ์ของผู้อ่านหลังจากอ่านหัวข้อข่าว: "emonews",
    ข้อความเป็นเสียง: "tts",
  },
  แปลภาษา: {
    แปลอังกฤษเป็นไทย: "en2th",
    แปลไทยเป็นอังกฤษ: "th2en",
    แปลไทยเป็นจีน: "th2zh",
    แปลจีนเป็นไทย: "zh2th",
  },
  รูปภาพ: {
    วิเคราะห์ภาพ: "vqa",
    ระบุชื่ออาหารไทยจากรูปภาพ: "tfood",
    อ่านป้ายทะเบียน: "lpr",
  },
};

const Menu = ({ mode, setMode, setMessages, setUser, setCon }) => {
  const [chats, setChats] = useState([]);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const router = useRouter();

  const params = useSearchParams();
  const conver = params.get("conver");
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${API_URL}/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        if (res.data.status) {
          setChats(res.data.convers);
        }
      })
      .catch((error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          router.push("/auth/login");
        } else {
          console.log("Error occurred:", error.message);
        }
      });
  }, [conver]);
  return (
    <div className="w-[300] border-r-2 border-white/10 bg-white bg-opacity-[0.8%] p-4 py-6 flex flex-col place-content-between">
      <div className="flex flex-col">
        <span className="text-xl text-center mb-6">CHAT WITH AI</span>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="email">เลือกโมเดล</Label>
          <Select
            className="mt-2"
            value={mode}
            onValueChange={(value) => {
              setMode(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกโมเดล" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(model).map((d, k) => (
                <SelectGroup key={k}>
                  <SelectLabel>{d[0]}</SelectLabel>
                  {Object.entries(d[1]).map((data, key) => (
                    <SelectItem key={key} value={data[1]} className="pl-5">
                      {data[0]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 flex-col space-y-1.5 mt-6">
          <Label htmlFor="email">ประวัติการแชท</Label>

          <div
        className={`flex gap-2 place-items-center border border-white/10 rounded-md p-2 cursor-pointer`}
        onClick={() => {
          setMessages([
            { text: "สวัสดี วันนี้ฉันจะช่วยเหลือคุณได้อย่างไร?", sender: "bot" },
          ])
          setCon("")
          router.push("/");
        }}
      >
        <PlusIcon /> เพิ่มแชทใหม่
      </div>

          {chats.map((d) => (
            <div
              className={`flex items-center gap-2 border border-white/10 rounded-md p-2 cursor-pointer ${
                d._id == conver ? "bg-white text-black" : ""
              }`}
              onClick={() => {
                if (d._id !== conver) {
                  setMessages([
                    {
                      text: "สวัสดี วันนี้ฉันจะช่วยเหลือคุณได้อย่างไร?",
                      sender: "bot",
                    },
                  ]);
                  router.push(`/?conver=${d._id}`);
                }
              }}
              key={d._id}
            >
              <MessageCircle className="text-sm"/> {d.name ?? "แชทใหม่"}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`flex items-center gap-2 border border-white/10 rounded-md p-2 cursor-pointer`}
        onClick={() => {
          localStorage.removeItem("token");
          router.push("/auth/login");
          setUser({ isLogin: false, username: "" });
        }}
      >
        <LogInIcon />
        ออกจากระบบ
      </div>
    </div>
  );
};

export default Menu;
