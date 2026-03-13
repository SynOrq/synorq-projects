import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: {
      members: { some: { userId: session.user.id } },
    },
    select: { id: true, name: true, slug: true },
  });

  const projects = workspace
    ? await db.project.findMany({
        where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
        select: { id: true, name: true, color: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <Sidebar session={session} workspace={workspace} projects={projects} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
