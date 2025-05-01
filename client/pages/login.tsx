"use client"

import { useEffect } from "react"
import { useRouter } from "next/router"
import { LoginCard } from "@/components/auth/login-card"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true") {
      router.push("/")
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <LoginCard />
    </div>
  )
}
