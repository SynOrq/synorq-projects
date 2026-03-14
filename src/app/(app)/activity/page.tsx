import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ActivityConsole from "@/components/activity/ActivityConsole";
import { buildWorkspaceActivityFeed } from "@/lib/workspace-activity";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  });

  if (!workspace) redirect("/auth/login");

  const items = await db.activityLog.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 160,
  });

  const feed = buildWorkspaceActivityFeed(
    items.map((item) => ({
      id: item.id,
      action: item.action,
      metadata: item.metadata,
      actorId: item.userId,
      actorName: item.user.name ?? item.user.email,
      projectId: item.projectId,
      projectName: item.project?.name ?? null,
      createdAt: item.createdAt,
    })),
    session.user.id
  );

  return <ActivityConsole workspaceName={workspace.name} items={feed.items} summary={feed.summary} />;
}
