"use client"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { toast } from 'react-toastify';
const RegisterPage = () => {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [repassword, setRePassword] = useState("")
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if(repassword !== password) return
    try {
      const response = await axios.post(`${API_URL}/register`, {username,password})
    if(response.data.status){
      toast.success("สมัครสมาชิกสำเร็จ")
      router.push('/auth/login')
    }
    } catch {
      toast.error("มีผู้ใช้งานนี้ในระบบแล้ว")
    }
  }

  return (
    <div className='flex place-content-center place-items-center h-screen'>
      <form onSubmit={handleSubmit}>
      <Card className="w-[400px]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">สมัครสมาชิก</CardTitle>
              <CardDescription>
              กรอกอีเมลและรหัสผ่านของคุณด้านล่าง
              </CardDescription>
            </CardHeader>
            <CardContent>
            
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">ชื่อผู้ใช้งาน</Label>
                  <Input
                    id="email"
                    onChange={(e)=>{setUsername(e.currentTarget.value)}}
                   placeholder="ชื่อผู้ใช้งาน"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    type="password"
                    onChange={(e)=>{setPassword(e.currentTarget.value)}}
                    placeholder="รหัสผ่าน"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">ยืนยัน-รหัสผ่าน</Label>
                  <Input
                    id="password"
                    type="password"
                    onChange={(e)=>{setRePassword(e.currentTarget.value)}}
                   placeholder="ยืนยัน-รหัสผ่าน"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 mt-4 place-content-center w-full">
              <Button type="submit" className="w-full">
                สมัครสมาชิก
              </Button>

              <div className="text-sm flex gap-1">
                มีบัญชีแล้ว ?
                <span
                  className="underline cursor-pointer"
                  onClick={() => {
                    router.push("/auth/login");
                  }}
                >
                  เข้าสู่ระบบ
                </span>
              </div>
            </CardFooter>
          </Card>
      </form>
    </div>
  )
}

export default RegisterPage