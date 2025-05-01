import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/router"

export function LoginCard() {
  const router = useRouter()

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true")
    router.push("/") // redirect to home after login
  }

  return (
    <Card className="w-full max-w-sm shadow-lg p-6">
      <CardContent className="flex flex-col gap-6 items-center">
        <img
          src="/linkedin-logo.png" // add logo to public folder if desired
          alt="LinkedIn Logo"
          className="h-10 mb-4"
        />
        <Button
          className="w-full bg-[#0077B5] text-white hover:bg-[#005983]"
          onClick={handleLogin}
        >
          Sign in with LinkedIn
        </Button>
      </CardContent>
    </Card>
  )
}
