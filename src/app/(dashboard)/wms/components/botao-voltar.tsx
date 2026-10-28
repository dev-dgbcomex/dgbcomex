"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BotaoVoltar() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.back()}
      className="gap-1.5"
    >
      <ArrowLeft size={14} /> Voltar
    </Button>
  )
}
