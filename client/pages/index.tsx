"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { CampaignForm } from "@/components/campaign/campaign-form"

export default function HomePage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") !== "true") {
      router.push("/login")
    }
  }, [])

  if (!isClient) return null

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <CampaignForm />
    </div>
  )
}
