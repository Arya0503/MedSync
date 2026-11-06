import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === Role.PATIENT) {
    redirect("/patient");
  } else if (session.role === Role.PHARMACIST) {
    redirect("/review");
  } else if (session.role === Role.CLINICIAN) {
    redirect("/clinic");
  } else if (session.role === Role.ADMIN) {
    redirect("/admin");
  }

  redirect("/login");
}
