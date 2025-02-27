"use client";

import { useEffect, useRef, useState } from "react";
import { Image, Send, Trash } from "lucide-react";
import axios from "axios";
import { model } from "./Menu";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";

export default function ChatUI({ mode, setMode, messages, setMessages }) {
  const [keyword, setKeyWord] = useState("");
  const bottomRef = useRef(null);
  const [con, setCon] = useState("");
  

  const imgMode = ["tfood", "vqa", "lpr"];
  const isImageMode = (d) => {return imgMode.includes(d)}

  
  const scroolToBT = () => {
    if (bottomRef.current) {
      bottomRef.current?.scroll({
        top: bottomRef.current?.scrollHeight,
      })
      setTimeout(() => {
        bottomRef.current?.scroll({
          top: bottomRef.current?.scrollHeight,
        });
      }, 400);
    }
  };

  const handleDelete = () => {

    const token = localStorage.getItem("token");

    axios
      .delete(`${API_URL}/chats/${con}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        if (res.data.status) {
          setMessages([
            { text: "สวัสดี วันนี้ฉันจะช่วยเหลือคุณได้อย่างไร?", sender: "bot" },
          ])
          router.push('/')
        }
      })
      
  }


  useEffect(() => scroolToBT(), [messages]);
  const router = useRouter();

  const searchParams = useSearchParams();

  useEffect(() => {
    const conver = searchParams.get("conver");
    if (conver) {
      const token = localStorage.getItem("token");
      axios
        .get(`${API_URL}/conversation?converId=${conver}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          if (res.data.status) {
            let data = [];
            res.data.conver.map((d) => {
              if (isImageMode(d.type)) {
                data.push({
                  text: `<img style="width: 300px" src='${API_URL}/${d.input}'/>`,
                  sender: "user",
                });
              } else {
                data.push({ text: d.input, sender: "user" });
              }
              if (d.type == "tokenize") {
                data.push({ text: d.answer.join(" "), sender: "bot" });
              } else if (d.type == "emonews" || d.type == "ssense") {
                data.push({
                  text: d.answer.replaceAll("\n", "<br>"),
                  sender: "bot",
                });
              } else if (d.type == "textqa") {
                const parts = d.answer.split(/(```[\s\S]*?```)/g);
                parts.map((part, _) => {
                  if (part.startsWith("```")) {
                    const code = part.trim();
                    setKeyWord(code);
                  }
                });
                data.push({ text: d.answer, sender: "bot" });
              } else if (d.type == "tts") {
                data.push({
                  text: `**ไฟล์เสียงของคุณ**<br><br><audio controls><source src="${API_URL}/${d.answer}" type="audio/wav"></audio>`,
                  sender: "bot",
                });
              } else if (d.type == "tfood") {
                data.push({
                  text: `**${d.answer[0].label}** | ความมันใจ ${d.answer[0].score}`,
                  sender: "bot",
                });
              } else {
                data.push({ text: d.answer, sender: "bot" });
              }
            });
            setMessages([...messages, ...data]);
            setCon(conver);
            scroolToBT();
          }
        });
    } else {
      // if (con == "") {
      //   startCon();
      // }
    }
  }, [searchParams]);
  // const [input, setInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const uploadImageRef = useRef(null);
  const sendMessage = async () => {
    let finalConver = ""
    let reroute = false
    if(con == ""){
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/conversation`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.status) {
        setCon(response.data.id);
        finalConver = response.data.id
        reroute = true
      }
    }else{
      finalConver = con
    }

    const input = inputRef.current.value;

    if (!input.trim() && !isImageMode(mode)) return;
    if (isImageMode(mode) && !file) return;
    const newMessages = [...messages, { text: input, sender: "user" }];
    if (input != "") {
      setMessages(newMessages);
    }
    // setInput("");
    inputRef.current.value = "";
    setFile(null);
    setPreview("");
    uploadImageRef.current.value = null;

    try {
      let endpoint = mode;

      setLoading(true);
      // const lastQA = messages[messages.length - 1];
      const userMessages = messages
        .filter((d) => d.sender === "user")
        .map((d) => d.text)
        .join(",");

      let requestData;
      if (isImageMode(mode)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("text", input);
        formData.append("conver", finalConver);
        requestData = formData;
      } else {
        requestData = {
          conver: finalConver,
          input: input,
          text:
            mode == "textqa"
              ? `นี่คือประวัติการแชท: ${keyword} นี่คือคำถามที่ฉันเคยถามไป: ${userMessages} นี่คือคำถามของฉัน: ${input}`
              : input,
        };
      }
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/${endpoint}`, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("API Response:", response.data);

      if (
        mode === "tokenize" &&
        response.data.tokens &&
        Array.isArray(response.data.tokens.result)
      ) {
        setMessages((prev) => [
          ...prev,
          { text: response.data.tokens.result.join(" "), sender: "bot" },
        ]);
      } else if (mode === "textqa" && response.data.answer) {
        const parts = response.data.answer.split(/(```[\s\S]*?```)/g);

        parts.map((part, index) => {
          if (part.startsWith("```")) {
            // const language = part.match(/```(\w+)\n/)?.[1] || "text";
            const code = part.trim();
            setKeyWord(code);
          }
        });

        setMessages((prev) => [
          ...prev,
          { text: response.data.answer, sender: "bot" },
        ]);
      } else if (
        mode === "en2th" &&
        response.data.translate &&
        response.data.translate.translated_text
      ) {
        setMessages((prev) => [
          ...prev,
          { text: response.data.translate.translated_text, sender: "bot" },
        ]);
      } else if (
        mode === "th2en" &&
        response.data.translate &&
        response.data.translate.translated_text
      ) {
        setMessages((prev) => [
          ...prev,
          { text: response.data.translate.translated_text, sender: "bot" },
        ]);
      } else if (mode === "vqa" && response.data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            text: `<img style="width: 300px" src='${API_URL}/${response.data.img}'/>`,
            sender: "user",
          },
          { text: `${response.data.answer}`, sender: "bot" },
        ]);
      } else if (mode === "lpr" && response.data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            text: `<img style="width: 300px" src='${API_URL}/${response.data.img}'/>`,
            sender: "user",
          },
          { text: `${response.data.answer}`, sender: "bot" },
        ]);
      } else if (mode === "tfood" && response.data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            text: `<img style="width: 300px" src='${API_URL}/${response.data.img}'/>`,
            sender: "user",
          },
          { text: `**${response.data.answer[0].label}** | ความมันใจ ${response.data.answer[0].score}`, sender: "bot" },
        ]);
      } else if (["emonews", "ssense"].includes(mode) && response.data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            text: `${response.data.answer.replaceAll("\n", "<br>")}`,
            sender: "bot",
          },
        ]);
      } else if (mode == "tts" && response.data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            text:
              response.data.answer == "เกิดข้อผิดพลาด"
                ? response.data.answer
                : `**ไฟล์เสียงของคุณ**<br><br><audio controls><source src="${API_URL}/${response.data.answer}" type="audio/wav"></audio>`,
            sender: "bot",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { text: "Unexpected API response format", sender: "bot" },
        ]);
      }

      setLoading(false);
    } catch (error) {
      console.error("API Error:", error);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${error.response?.data?.message || error.message}`,
          sender: "bot",
        },
      ]);
    }

    if(reroute){
      setMessages([])
      router.push(`/?conver=${finalConver}`);
    }
  };

  const [modelName, setModelName] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("ไม่สามารถคัดลอกได้:", err);
    }
  };
  const renderMessage = (message) => {
    console.log("RENDER");
    const parts = message.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const language = part.match(/```(\w+)\n/)?.[1] || "text";
        const code = part
          .replace(/```(\w+)?\n?/, "")
          .replace(/```/, "")
          .trim();
        return (
          <div key={index} className="relative">
            <button
              onClick={() => handleCopy(code)}
              className="absolute top-2 right-2 bg-gray-700 mt-1 text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-600"
            >
              คัดลอก
            </button>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              className="rounded-lg my-2"
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }

      let formattedMessage = part;
      // formattedMessage = formattedMessage.replace(/`/g, "&#96;");
      formattedMessage = formattedMessage.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );
      formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, "<em>$1</em>");
      formattedMessage = formattedMessage.replace(
        /\*\*\*(.*?)\*\*\*/g,
        "<em><strong>$1</strong></em>"
      );

      formattedMessage = formattedMessage.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g,
        '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>'
      );

      const msgPart = formattedMessage.split(/(\d+\.\s[^0-9]+(?:\s+|$))/g);
      let html = ``;
      msgPart.map((part, index) => {
        if (part.match(/^\d+\.\s/)) {
          html += `<ul key={index}>
              <li>${part}</li>
            </ul>`;
        }
      });

      return (
        <p
          key={index}
          className="my-2"
          dangerouslySetInnerHTML={{
            __html: html && html != `` ? html : formattedMessage,
          }}
        ></p>
      );
    });
  };

  useEffect(() => {
    if (mode) {
      console.log(model);
      const f = Object.entries(model).map(([category, subModels]) => {
        const matchingSubCategory = Object.entries(subModels).find(([key, value]) => value === mode);
        if (matchingSubCategory) {
          return { category, subCategory: matchingSubCategory[0] };
        }
      }).filter(Boolean);
      setModelName(f[0].subCategory);
    }
  }, [mode]);
  return (
    <div className="flex flex-col h-screen bg-transparent max-w-4xl mx-auto w-full relative">
      {/* <div className="p-4 flex justify-center">
        <Button onClick={() => setMode("tokenize")} className={`mr-2 ${mode === "tokenize" ? "bg-blue-500 text-white" : "bg-gray-300"}`}>ตัดคำ</Button>
        <Button onClick={() => setMode("textqa")} className={`mr-2 ${mode === "textqa" ? "bg-blue-500 text-white" : "bg-gray-300"}`}>ถามตอบ</Button>
        <Button onClick={() => setMode("en2th")} className={`mr-2 ${mode === "en2th" ? "bg-blue-500 text-white" : "bg-gray-300"}`}>แปลเป็นไทย</Button>
        <Button onClick={() => setMode("th2en")} className={`${mode === "th2en" ? "bg-blue-500 text-white" : "bg-gray-300"}`}>แปลเป็นEN</Button>
      </div> */}
     
      <p className="p-3 text-xl text-center">โหมด : {modelName}
        
      <Button className="w-4 h-8 ml-3" onClick={handleDelete}><Trash /></Button>
         </p>


      {/* {JSON.stringify(messages)} */}
      {/* {keyword} */}
      <div className="flex-grow p-4 overflow-y-auto" ref={bottomRef}>
        {messages.map((msg, index) => (
          <Card
            key={index}
            className={`mb-2 px-3 max-w-2xl w-fit ${
              msg.sender === "user" ? "ml-auto bg-white text-black" : "mr-auto"
            }`}
          >
            <CardContent className="p-0 flex flex-col">
              {renderMessage(msg.text)}
            </CardContent>
          </Card>
        ))}

        {loading ? (
          <div className="py-3">
            <div className="lds-ripple">
              <div></div>
              <div></div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="p-4 flex items-center w-full relative">
        <input
          type="file"
          className="hidden"
          ref={uploadImageRef}
          // value={file}
          onChange={handleFileChange}
        ></input>

        <Button
          onClick={() => {
            // console.log(uploadImageRef)
            uploadImageRef.current?.click();
          }}
          className="mr-2 w-8 h-8"
        >
          <Image className="text-xl" />
        </Button>
        <Input
          className="flex-grow mr-2 h-28"
          placeholder="ถามมาได้เลย"
          // value={input}
          ref={inputRef}
          // onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        {preview ? (
          <div className="absolute right-28 rounded-md w-20 h-20 flex place-content-center place-items-center border border-white/5 p-2">
            <img src={preview}></img>
          </div>
        ) : null}
        <Button onClick={sendMessage} className="absolute right-10 w-12 h-12">
          <Send className="text-xl" />
        </Button>
      </div>
    </div>
  );
}
