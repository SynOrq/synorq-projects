import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Priority, ProjectStatus, ProjectType, ProjectVisibility } from "@prisma/client";
import { VALID_PROJECT_VISIBILITY } from "@/lib/project-settings";

const VALID_PROJECT_TYPES: ProjectType[] = ["WEBSITE", "MOBILE_APP", "RETAINER", "INTERNAL", "MAINTENANCE"];
const VALID_PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
const VALID_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const TEMPLATE_TASKS: Record<ProjectType, string[]> = {
  WEBSITE: [
    "Kickoff scope and launch owners",
    "Prepare design QA and content freeze checklist",
    "Confirm launch readiness and stakeholder review",
  ],
  MOBILE_APP: [
    "Review release scope and pilot milestones",
    "Run QA pass and triage blockers",
    "Prepare release notes and enablement plan",
  ],
  RETAINER: [
    "Map recurring deliverables for this cycle",
    "Assign weekly reporting owner",
    "Capture pending approvals and revision risks",
  ],
  INTERNAL: [
    "Define initiative owner and operating rhythm",
    "Create playbook or template deliverables",
    "Review adoption blockers and next actions",
  ],
  MAINTENANCE: [
    "Triage backlog and service-level priorities",
    "Plan QA and patch release slots",
    "Confirm customer communication summary",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    const currentUserId = session.user.id;

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: currentUserId } } },
      include: {
        members: { select: { userId: true } },
      },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace bulunamadi." }, { status: 404 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const color = typeof body.color === "string" ? body.color : "#6366f1";
    const type = typeof body.type === "string" ? body.type.toUpperCase() : "INTERNAL";
    const status = typeof body.status === "string" ? body.status.toUpperCase() : "ACTIVE";
    const visibility = typeof body.visibility === "string" ? body.visibility.toUpperCase() : "WORKSPACE";
    const priority = typeof body.priority === "string" ? body.priority.toUpperCase() : "MEDIUM";
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : currentUserId;
    const clientId = typeof body.clientId === "string" && body.clientId.length > 0 ? body.clientId : null;
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item: string) => item.trim())
      : [];
    const teamMemberIds: string[] = Array.isArray(body.teamMemberIds)
      ? body.teamMemberIds.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const startDate = typeof body.startDate === "string" && body.startDate ? new Date(body.startDate) : null;
    const dueDate = typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;

    if (!name) return NextResponse.json({ error: "Proje adi zorunludur." }, { status: 400 });
    if (!VALID_PROJECT_TYPES.includes(type as ProjectType)) {
      return NextResponse.json({ error: "Gecersiz proje tipi." }, { status: 400 });
    }
    if (!VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) {
      return NextResponse.json({ error: "Gecersiz proje durumu." }, { status: 400 });
    }
    if (!VALID_PROJECT_VISIBILITY.includes(visibility as ProjectVisibility)) {
      return NextResponse.json({ error: "Gecersiz proje gorunurluk seviyesi." }, { status: 400 });
    }
    if (!VALID_PRIORITIES.includes(priority as Priority)) {
      return NextResponse.json({ error: "Gecersiz proje onceligi." }, { status: 400 });
    }

    const workspaceMemberIds = new Set(workspace.members.map((member) => member.userId));
    if (!workspaceMemberIds.has(ownerId)) {
      return NextResponse.json({ error: "Proje owner bu workspace icinde olmali." }, { status: 400 });
    }

    let client = null;
    if (clientId) {
      client = await db.client.findFirst({
        where: { id: clientId, workspaceId: workspace.id },
        select: { id: true, name: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Secilen client bu workspace icinde bulunamadi." }, { status: 400 });
      }
    }

    const starterAssignees: string[] = [...new Set(teamMemberIds.filter((id: string) => workspaceMemberIds.has(id)))];
    const starterTasks = TEMPLATE_TASKS[type as ProjectType];

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        ownerId,
        clientId,
        name,
        description: description || null,
        color,
        status: status as ProjectStatus,
        type: type as ProjectType,
        visibility: visibility as ProjectVisibility,
        priority: priority as Priority,
        tags,
        startDate,
        dueDate,
        sections: {
          create: [
            { name: "Planlandi", order: 0 },
            { name: "Yurutmede", order: 1 },
            { name: "Incelemede", order: 2 },
            { name: "Teslime Hazir", order: 3 },
          ],
        },
      },
      include: {
        sections: { orderBy: { order: "asc" }, select: { id: true } },
      },
    });

    const backlogSectionId = project.sections[0]?.id ?? null;
    if (backlogSectionId) {
      await Promise.all(
        starterTasks.map((title, index) =>
          db.task.create({
            data: {
              projectId: project.id,
              sectionId: backlogSectionId,
              title,
              description: `${name} icin otomatik baslangic gorevi.`,
              creatorId: currentUserId,
              assigneeId: starterAssignees[index % Math.max(starterAssignees.length, 1)] ?? null,
              order: index,
              priority: index === 0 ? "HIGH" : "MEDIUM",
              labels: [type as string, "Starter"],
            },
          })
        )
      );
    }

    await db.activityLog.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        userId: currentUserId,
        action: "project.created",
        metadata: {
          projectId: project.id,
          name,
          clientName: client?.name ?? null,
          ownerId,
          type,
          visibility,
          priority,
        },
      },
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (err) {
    console.error("[projects/POST]", err);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
