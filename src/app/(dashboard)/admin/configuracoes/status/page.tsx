import { redirect } from "next/navigation"

export default function StatusPage() {
  redirect("/perfil/menus?statusTipo=OPORTUNIDADE")
}
