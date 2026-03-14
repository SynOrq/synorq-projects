require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || "",
  }),
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysFromNow(offset, hour = 10) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() + offset);
  return value;
}

function hoursAgo(offset) {
  return new Date(Date.now() - offset * 60 * 60 * 1000);
}

async function ensureWorkspace() {
  const existingWorkspace = await prisma.workspace.findFirst({
    include: {
      owner: true,
      members: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingWorkspace) return existingWorkspace;

  const password = await bcrypt.hash("demo12345", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@synorq.demo" },
    update: {},
    create: {
      name: "Tarik Celik",
      email: "owner@synorq.demo",
      password,
      role: "OWNER",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Synorq Demo",
      slug: "synorq-demo",
      description: "Agency delivery operations demo workspace",
      ownerId: owner.id,
      members: {
        create: {
          userId: owner.id,
          role: "ADMIN",
        },
      },
    },
    include: {
      owner: true,
      members: true,
    },
  });

  return workspace;
}

async function seed() {
  const workspace = await ensureWorkspace();

  const demoPeople = [
    {
      key: "opsLead",
      name: "Aylin Demir",
      email: "aylin@synorq.demo",
      role: "ADMIN",
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Aylin%20Demir",
    },
    {
      key: "deliveryManager",
      name: "Emre Kaya",
      email: "emre@synorq.demo",
      role: "MEMBER",
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Emre%20Kaya",
    },
    {
      key: "designer",
      name: "Selin Yilmaz",
      email: "selin@synorq.demo",
      role: "MEMBER",
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Selin%20Yilmaz",
    },
    {
      key: "engineer",
      name: "Bora Aksoy",
      email: "bora@synorq.demo",
      role: "MEMBER",
      image: "https://api.dicebear.com/9.x/initials/svg?seed=Bora%20Aksoy",
    },
  ];

  const memberIndex = {
    owner: workspace.ownerId,
  };
  const clientIndex = {};

  const defaultPassword = await bcrypt.hash("demo12345", 10);

  for (const person of demoPeople) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        image: person.image,
      },
      create: {
        name: person.name,
        email: person.email,
        password: defaultPassword,
        image: person.image,
      },
    });

    memberIndex[person.key] = user.id;

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {
        role: person.role,
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: person.role,
      },
    });
  }

  const clientBlueprints = [
    {
      key: "northstar",
      name: "Northstar Health",
      industry: "Healthcare",
      health: "WATCH",
      notes: "Launch visibility is high and approval loops are tight.",
      ownerId: memberIndex.opsLead,
    },
    {
      key: "atlas",
      name: "Atlas Logistics",
      industry: "Logistics",
      health: "WATCH",
      notes: "Mobile pilot needs close release governance.",
      ownerId: memberIndex.deliveryManager,
    },
    {
      key: "helio",
      name: "Helio Commerce",
      industry: "Retail",
      health: "AT_RISK",
      notes: "Retainer scope is active and review requests are frequent.",
      ownerId: memberIndex.opsLead,
    },
  ];

  for (const client of clientBlueprints) {
    const slug = slugify(client.name);
    const record = await prisma.client.upsert({
      where: {
        workspaceId_slug: {
          workspaceId: workspace.id,
          slug,
        },
      },
      update: {
        name: client.name,
        industry: client.industry,
        health: client.health,
        notes: client.notes,
        ownerId: client.ownerId,
      },
      create: {
        workspaceId: workspace.id,
        ownerId: client.ownerId,
        name: client.name,
        slug,
        industry: client.industry,
        health: client.health,
        notes: client.notes,
      },
    });

    clientIndex[client.key] = record.id;
  }

  await prisma.workspaceUserState.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: workspace.ownerId,
      },
    },
    update: {
      riskAlertsEnabled: true,
      activityAlertsEnabled: true,
      weeklyDigestEnabled: true,
    },
    create: {
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      riskAlertsEnabled: true,
      activityAlertsEnabled: true,
      weeklyDigestEnabled: true,
    },
  });

  const projectBlueprints = [
    {
      name: "Northstar Website Relaunch",
      description: "Client-facing relaunch covering IA, design QA, CMS migration and launch readiness.",
      color: "#2563eb",
      status: "ACTIVE",
      type: "WEBSITE",
      priority: "URGENT",
      tags: ["Launch", "Client", "Website"],
      ownerId: memberIndex.opsLead,
      clientId: clientIndex.northstar,
      startDate: daysFromNow(-12),
      dueDate: daysFromNow(4),
      tasks: [
        {
          title: "Finalize launch checklist and cutover owners",
          section: "Incelemede",
          status: "IN_REVIEW",
          priority: "URGENT",
          dueDate: daysFromNow(1),
          assigneeId: memberIndex.opsLead,
          labels: ["Milestone", "Launch"],
          comments: [
            { authorId: workspace.ownerId, content: "Client approval is pending on final redirects." },
            { authorId: memberIndex.deliveryManager, content: "SEO sign-off is scheduled for tomorrow morning." },
          ],
        },
        {
          title: "Resolve mobile nav overflow on campaign pages",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: daysFromNow(-1),
          assigneeId: memberIndex.engineer,
          labels: ["Bug", "Blocked"],
          subtasks: [
            {
              title: "Verify menu state in Safari iOS",
              status: "IN_PROGRESS",
              priority: "MEDIUM",
              assigneeId: memberIndex.engineer,
            },
          ],
        },
        {
          title: "Prepare stakeholder walkthrough deck",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(2),
          assigneeId: null,
          labels: ["Client"],
        },
        {
          title: "Publish CMS migration completion note",
          section: "Teslime Hazir",
          status: "DONE",
          priority: "LOW",
          dueDate: daysFromNow(-2),
          completedAt: daysFromNow(-2, 16),
          assigneeId: memberIndex.deliveryManager,
          labels: ["Content"],
          comments: [
            { authorId: memberIndex.deliveryManager, content: "Migration summary shared with client and archive team." },
          ],
        },
      ],
    },
    {
      name: "Atlas Mobile Pilot",
      description: "Pilot release for field operations app with QA, release notes and adoption onboarding.",
      color: "#0f766e",
      status: "ACTIVE",
      type: "MOBILE_APP",
      priority: "HIGH",
      tags: ["Pilot", "Mobile"],
      ownerId: memberIndex.deliveryManager,
      clientId: clientIndex.atlas,
      startDate: daysFromNow(-18),
      dueDate: daysFromNow(7),
      tasks: [
        {
          title: "Close beta regression triage",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "URGENT",
          dueDate: daysFromNow(0),
          assigneeId: memberIndex.engineer,
          labels: ["Mobile", "Risk"],
          comments: [{ authorId: memberIndex.opsLead, content: "Need a noon status update before pilot greenlight." }],
        },
        {
          title: "Review app store submission assets",
          section: "Incelemede",
          status: "IN_REVIEW",
          priority: "HIGH",
          dueDate: daysFromNow(3),
          assigneeId: memberIndex.designer,
          labels: ["Design", "Client"],
        },
        {
          title: "Assign field enablement session owner",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(4),
          assigneeId: null,
          labels: ["Ops"],
        },
        {
          title: "Approve release notes draft",
          section: "Teslime Hazir",
          status: "DONE",
          priority: "LOW",
          dueDate: daysFromNow(-3),
          completedAt: daysFromNow(-3, 15),
          assigneeId: memberIndex.deliveryManager,
          labels: ["Release"],
        },
      ],
    },
    {
      name: "Helio Retainer Sprint 12",
      description: "Ongoing retainer delivery covering campaign QA, reporting and approval loops.",
      color: "#ea580c",
      status: "ACTIVE",
      type: "RETAINER",
      priority: "HIGH",
      tags: ["Retainer", "Reporting"],
      ownerId: memberIndex.opsLead,
      clientId: clientIndex.helio,
      startDate: daysFromNow(-9),
      dueDate: daysFromNow(2),
      tasks: [
        {
          title: "Ship weekly analytics summary",
          section: "Incelemede",
          status: "IN_REVIEW",
          priority: "HIGH",
          dueDate: daysFromNow(1),
          assigneeId: memberIndex.opsLead,
          labels: ["Reporting"],
        },
        {
          title: "Refresh paid media landing variants",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: daysFromNow(2),
          assigneeId: memberIndex.designer,
          labels: ["Creative"],
        },
        {
          title: "Backfill overdue SEO recommendations",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(-2),
          assigneeId: memberIndex.deliveryManager,
          labels: ["SEO", "Risk"],
        },
      ],
    },
    {
      name: "Internal Delivery Standards",
      description: "Internal initiative for templates, QA rhythm and playbook cleanup across service teams.",
      color: "#7c3aed",
      status: "ON_HOLD",
      type: "INTERNAL",
      priority: "MEDIUM",
      tags: ["Internal", "Operations"],
      ownerId: workspace.ownerId,
      clientId: null,
      startDate: daysFromNow(-22),
      dueDate: daysFromNow(11),
      tasks: [
        {
          title: "Define default weekly status report format",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(6),
          assigneeId: memberIndex.opsLead,
          labels: ["Internal"],
        },
        {
          title: "Document QA handoff checklist",
          section: "Teslime Hazir",
          status: "DONE",
          priority: "LOW",
          dueDate: daysFromNow(-5),
          completedAt: daysFromNow(-5, 17),
          assigneeId: workspace.ownerId,
          labels: ["Template"],
        },
        {
          title: "Map recurring blockers from last 30 days",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          dueDate: daysFromNow(5),
          assigneeId: memberIndex.deliveryManager,
          labels: ["Ops"],
        },
      ],
    },
  ];

  for (const blueprint of projectBlueprints) {
    let project = await prisma.project.findFirst({
      where: {
        workspaceId: workspace.id,
        name: blueprint.name,
      },
      include: {
        sections: true,
      },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          ownerId: blueprint.ownerId,
          clientId: blueprint.clientId,
          name: blueprint.name,
          description: blueprint.description,
          color: blueprint.color,
          status: blueprint.status,
          type: blueprint.type,
          priority: blueprint.priority,
          tags: blueprint.tags,
          startDate: blueprint.startDate,
          dueDate: blueprint.dueDate,
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
          sections: true,
        },
      });
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: {
          ownerId: blueprint.ownerId,
          clientId: blueprint.clientId,
          description: blueprint.description,
          color: blueprint.color,
          status: blueprint.status,
          type: blueprint.type,
          priority: blueprint.priority,
          tags: blueprint.tags,
          startDate: blueprint.startDate,
          dueDate: blueprint.dueDate,
        },
        include: {
          sections: true,
        },
      });
    }

    const sectionMap = Object.fromEntries(project.sections.map((section) => [section.name, section]));

    for (let index = 0; index < blueprint.tasks.length; index += 1) {
      const taskBlueprint = blueprint.tasks[index];
      let task = await prisma.task.findFirst({
        where: {
          projectId: project.id,
          title: taskBlueprint.title,
          parentId: null,
        },
      });

      if (!task) {
        task = await prisma.task.create({
          data: {
            projectId: project.id,
            sectionId: sectionMap[taskBlueprint.section]?.id ?? null,
            title: taskBlueprint.title,
            description: `${blueprint.name} deliverable inside the Synorq demo workspace.`,
            status: taskBlueprint.status,
            priority: taskBlueprint.priority,
            creatorId: workspace.ownerId,
            assigneeId: taskBlueprint.assigneeId,
            order: index,
            dueDate: taskBlueprint.dueDate ?? null,
            completedAt: taskBlueprint.completedAt ?? null,
            labels: taskBlueprint.labels,
            estimatedH: 4 + index,
            loggedH: taskBlueprint.status === "DONE" ? 3 + index : Math.max(1, index),
            createdAt: daysFromNow(-10 + index),
          },
        });
      }

      if (taskBlueprint.subtasks) {
        for (const [subIndex, subTask] of taskBlueprint.subtasks.entries()) {
          const existingSubTask = await prisma.task.findFirst({
            where: {
              projectId: project.id,
              parentId: task.id,
              title: subTask.title,
            },
          });

          if (!existingSubTask) {
            await prisma.task.create({
              data: {
                projectId: project.id,
                sectionId: task.sectionId,
                parentId: task.id,
                title: subTask.title,
                status: subTask.status,
                priority: subTask.priority,
                creatorId: workspace.ownerId,
                assigneeId: subTask.assigneeId,
                order: subIndex,
              },
            });
          }
        }
      }

      if (taskBlueprint.comments) {
        for (const comment of taskBlueprint.comments) {
          const exists = await prisma.comment.findFirst({
            where: {
              taskId: task.id,
              authorId: comment.authorId,
              content: comment.content,
            },
          });

          if (!exists) {
            await prisma.comment.create({
              data: {
                taskId: task.id,
                authorId: comment.authorId,
                content: comment.content,
              },
            });
          }
        }
      }
    }
  }

  const existingActivityCount = await prisma.activityLog.count({
    where: { workspaceId: workspace.id },
  });

  if (existingActivityCount < 12) {
    const activityPayload = [
      {
        action: "workspace.member.invited",
        userId: workspace.ownerId,
        projectId: null,
        createdAt: hoursAgo(22),
        metadata: { invitedEmail: "aylin@synorq.demo", role: "ADMIN" },
      },
      {
        action: "workspace.member.invited",
        userId: workspace.ownerId,
        projectId: null,
        createdAt: hoursAgo(21),
        metadata: { invitedEmail: "emre@synorq.demo", role: "MEMBER" },
      },
      {
        action: "workspace.updated",
        userId: workspace.ownerId,
        projectId: null,
        createdAt: hoursAgo(20),
        metadata: { field: "deliveryRhythm", value: "weekly-digest-enabled" },
      },
    ];

    const projects = await prisma.project.findMany({
      where: {
        workspaceId: workspace.id,
        name: { in: projectBlueprints.map((item) => item.name) },
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            section: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    for (const project of projects) {
      const firstTask = project.tasks[0];
      const secondTask = project.tasks[1];

      if (firstTask) {
        activityPayload.push({
          action: "task.created",
          userId: workspace.ownerId,
          projectId: project.id,
          createdAt: hoursAgo(18 - activityPayload.length),
          metadata: {
            taskId: firstTask.id,
            title: firstTask.title,
            toSectionName: firstTask.section?.name ?? null,
          },
        });
      }

      if (secondTask) {
        activityPayload.push({
          action: "task.moved",
          userId: memberIndex.deliveryManager,
          projectId: project.id,
          createdAt: hoursAgo(10 - Math.min(activityPayload.length, 8)),
          metadata: {
            taskId: secondTask.id,
            fromSectionName: "Planlandi",
            toSectionName: secondTask.section?.name ?? "Yurutmede",
          },
        });
      }
    }

    const lastTask = await prisma.task.findFirst({
      where: {
        project: { workspaceId: workspace.id },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (lastTask) {
      activityPayload.push({
        action: "task.commented",
        userId: memberIndex.opsLead,
        projectId: lastTask.projectId,
        createdAt: hoursAgo(2),
        metadata: {
          taskId: lastTask.id,
        },
      });
    }

    for (const activity of activityPayload) {
      await prisma.activityLog.create({
        data: {
          workspaceId: workspace.id,
          projectId: activity.projectId,
          userId: activity.userId,
          action: activity.action,
          metadata: activity.metadata,
          createdAt: activity.createdAt,
        },
      });
    }
  }

  const summary = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
    prisma.project.count({ where: { workspaceId: workspace.id } }),
    prisma.task.count({ where: { project: { workspaceId: workspace.id } } }),
    prisma.activityLog.count({ where: { workspaceId: workspace.id } }),
  ]);

  console.log(
    JSON.stringify(
      {
        workspace: workspace.name,
        members: summary[0],
        projects: summary[1],
        tasks: summary[2],
        activities: summary[3],
      },
      null,
      2
    )
  );
}

seed()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
