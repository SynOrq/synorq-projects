/* eslint-disable @typescript-eslint/no-require-imports */
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
  const capacityBlueprints = {
    owner: { weeklyCapacityHours: 28, reservedHours: 4, outOfOfficeHours: 0 },
    opsLead: { weeklyCapacityHours: 30, reservedHours: 6, outOfOfficeHours: 0 },
    deliveryManager: { weeklyCapacityHours: 34, reservedHours: 4, outOfOfficeHours: 0 },
    designer: { weeklyCapacityHours: 30, reservedHours: 2, outOfOfficeHours: 0 },
    engineer: { weeklyCapacityHours: 36, reservedHours: 1, outOfOfficeHours: 0 },
  };

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

  const workspaceMemberships = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
  });
  const workspaceMemberByUserId = Object.fromEntries(
    workspaceMemberships.map((membership) => [membership.userId, membership])
  );

  for (const [key, userId] of Object.entries(memberIndex)) {
    const membership = workspaceMemberByUserId[userId];
    const capacityProfile = capacityBlueprints[key];

    if (!membership || !capacityProfile) continue;

    await prisma.workspaceMemberCapacity.upsert({
      where: { workspaceMemberId: membership.id },
      update: capacityProfile,
      create: {
        workspaceMemberId: membership.id,
        ...capacityProfile,
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
      contractValue: 240000,
      contractStartDate: daysFromNow(-45),
      contractEndDate: daysFromNow(120),
      retainerCadence: "PROJECT",
      retainerStatus: "ACTIVE",
      portal: {
        isPublished: true,
        welcomeTitle: "Northstar delivery portal",
        welcomeMessage: "Launch prep, approval signals and near-term delivery items tek akista gosterilir.",
        accentColor: "#2563eb",
      },
    },
    {
      key: "atlas",
      name: "Atlas Logistics",
      industry: "Logistics",
      health: "WATCH",
      notes: "Mobile pilot needs close release governance.",
      ownerId: memberIndex.deliveryManager,
      contractValue: 180000,
      contractStartDate: daysFromNow(-60),
      contractEndDate: daysFromNow(90),
      retainerCadence: "PROJECT",
      retainerStatus: "ACTIVE",
      portal: {
        isPublished: true,
        welcomeTitle: "Atlas pilot portal",
        welcomeMessage: "Mobile pilot release, field enablement ve regression kapanislari client ozetinde toplanir.",
        accentColor: "#0f766e",
      },
    },
    {
      key: "helio",
      name: "Helio Commerce",
      industry: "Retail",
      health: "AT_RISK",
      notes: "Retainer scope is active and review requests are frequent.",
      ownerId: memberIndex.opsLead,
      contractValue: 36000,
      contractStartDate: daysFromNow(-180),
      contractEndDate: daysFromNow(18),
      retainerCadence: "MONTHLY",
      retainerStatus: "RENEWAL_DUE",
      portal: {
        isPublished: false,
        welcomeTitle: "Helio sprint portal",
        welcomeMessage: "Retainer sprint ritmi, review pressure ve teslim takvimi draft modunda tutulur.",
        accentColor: "#ea580c",
      },
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
        contractValue: client.contractValue,
        contractStartDate: client.contractStartDate,
        contractEndDate: client.contractEndDate,
        retainerCadence: client.retainerCadence,
        retainerStatus: client.retainerStatus,
      },
      create: {
        workspaceId: workspace.id,
        ownerId: client.ownerId,
        name: client.name,
        slug,
        industry: client.industry,
        health: client.health,
        notes: client.notes,
        contractValue: client.contractValue,
        contractStartDate: client.contractStartDate,
        contractEndDate: client.contractEndDate,
        retainerCadence: client.retainerCadence,
        retainerStatus: client.retainerStatus,
      },
    });

    clientIndex[client.key] = record.id;

    await prisma.clientPortal.upsert({
      where: { clientId: record.id },
      update: {
        isPublished: client.portal.isPublished,
        welcomeTitle: client.portal.welcomeTitle,
        welcomeMessage: client.portal.welcomeMessage,
        accentColor: client.portal.accentColor,
        publishedAt: client.portal.isPublished ? new Date() : null,
      },
      create: {
        clientId: record.id,
        isPublished: client.portal.isPublished,
        welcomeTitle: client.portal.welcomeTitle,
        welcomeMessage: client.portal.welcomeMessage,
        accentColor: client.portal.accentColor,
        publishedAt: client.portal.isPublished ? new Date() : null,
      },
    });
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
      savedProjectsView: {
        label: "Riskte olanlar",
        status: "ALL",
        health: "risk",
        view: "table",
        q: null,
      },
    },
    create: {
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      riskAlertsEnabled: true,
      activityAlertsEnabled: true,
      weeklyDigestEnabled: true,
      savedProjectsView: {
        label: "Riskte olanlar",
        status: "ALL",
        health: "risk",
        view: "table",
        q: null,
      },
    },
  });

  const projectBlueprints = [
    {
      name: "Northstar Website Relaunch",
      description: "Client-facing relaunch covering IA, design QA, CMS migration and launch readiness.",
      color: "#2563eb",
      status: "ACTIVE",
      type: "WEBSITE",
      visibility: "WORKSPACE",
      priority: "URGENT",
      tags: ["Launch", "Client", "Website"],
      ownerId: memberIndex.opsLead,
      clientId: clientIndex.northstar,
      startDate: daysFromNow(-12),
      dueDate: daysFromNow(4),
      milestones: [
        {
          key: "launch-readiness",
          title: "Launch readiness review",
          description: "Final launch checklist, redirects and QA closeout.",
          ownerId: memberIndex.opsLead,
          status: "AT_RISK",
          dueDate: daysFromNow(1),
        },
        {
          key: "client-signoff",
          title: "Client sign-off package",
          description: "Stakeholder walkthrough and final approvals.",
          ownerId: memberIndex.deliveryManager,
          status: "IN_PROGRESS",
          dueDate: daysFromNow(3),
        },
      ],
      risks: [
        {
          title: "Redirect approval may slip launch window",
          description: "Client approval on redirect matrix is still pending and can delay go-live.",
          status: "OPEN",
          impact: "CRITICAL",
          likelihood: "HIGH",
          ownerId: memberIndex.opsLead,
          dueDate: daysFromNow(1),
          mitigationPlan: "Run escalation check-in and lock final owner list before noon.",
          taskTitle: "Finalize launch checklist and cutover owners",
        },
        {
          title: "Mobile navigation defect blocks QA sign-off",
          description: "Campaign page navigation issue remains open on Safari iOS.",
          status: "MITIGATING",
          impact: "HIGH",
          likelihood: "HIGH",
          ownerId: memberIndex.engineer,
          dueDate: daysFromNow(0),
          mitigationPlan: "Pair debug with QA and isolate browser-specific state handling today.",
          taskTitle: "Resolve mobile nav overflow on campaign pages",
        },
      ],
      tasks: [
        {
          title: "Finalize launch checklist and cutover owners",
          section: "Incelemede",
          status: "IN_REVIEW",
          priority: "URGENT",
          dueDate: daysFromNow(1),
          assigneeId: memberIndex.opsLead,
          milestoneKey: "launch-readiness",
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
          milestoneKey: "launch-readiness",
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
          milestoneKey: "client-signoff",
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
          milestoneKey: "client-signoff",
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
      visibility: "MEMBERS",
      priority: "HIGH",
      tags: ["Pilot", "Mobile"],
      ownerId: memberIndex.deliveryManager,
      clientId: clientIndex.atlas,
      startDate: daysFromNow(-18),
      dueDate: daysFromNow(7),
      milestones: [
        {
          key: "pilot-greenlight",
          title: "Pilot release greenlight",
          description: "Regression closeout and release checklist approval.",
          ownerId: memberIndex.deliveryManager,
          status: "IN_PROGRESS",
          dueDate: daysFromNow(2),
        },
        {
          key: "field-enablement",
          title: "Field enablement readiness",
          description: "Training owner and adoption kit prepared for launch.",
          ownerId: memberIndex.opsLead,
          status: "PLANNED",
          dueDate: daysFromNow(4),
        },
      ],
      risks: [
        {
          title: "Regression triage may block pilot release",
          description: "Open mobile regressions still require final verification before greenlight.",
          status: "OPEN",
          impact: "HIGH",
          likelihood: "HIGH",
          ownerId: memberIndex.deliveryManager,
          dueDate: daysFromNow(1),
          mitigationPlan: "Create noon checkpoint and freeze non-critical scope until triage closes.",
          taskTitle: "Close beta regression triage",
        },
      ],
      tasks: [
        {
          title: "Close beta regression triage",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "URGENT",
          dueDate: daysFromNow(0),
          assigneeId: memberIndex.engineer,
          milestoneKey: "pilot-greenlight",
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
          milestoneKey: "pilot-greenlight",
          labels: ["Design", "Client"],
        },
        {
          title: "Assign field enablement session owner",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(4),
          assigneeId: null,
          milestoneKey: "field-enablement",
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
          milestoneKey: "pilot-greenlight",
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
      visibility: "LEADERSHIP",
      priority: "HIGH",
      tags: ["Retainer", "Reporting"],
      ownerId: memberIndex.opsLead,
      clientId: clientIndex.helio,
      startDate: daysFromNow(-9),
      dueDate: daysFromNow(2),
      milestones: [
        {
          key: "weekly-report",
          title: "Weekly reporting handoff",
          description: "Analytics summary and client review package must be ready.",
          ownerId: memberIndex.opsLead,
          status: "AT_RISK",
          dueDate: daysFromNow(1),
        },
      ],
      risks: [
        {
          title: "Review cycle volume is increasing",
          description: "Helio is generating more revision loops than planned for this sprint.",
          status: "WATCH",
          impact: "HIGH",
          likelihood: "MEDIUM",
          ownerId: memberIndex.opsLead,
          dueDate: daysFromNow(2),
          mitigationPlan: "Scope review requests into a single approval batch and cap ad-hoc asks.",
          taskTitle: "Ship weekly analytics summary",
        },
        {
          title: "SEO backlog is already overdue",
          description: "Delayed recommendations may affect perceived delivery quality this week.",
          status: "OPEN",
          impact: "HIGH",
          likelihood: "HIGH",
          ownerId: memberIndex.deliveryManager,
          dueDate: daysFromNow(0),
          mitigationPlan: "Reassign two items and lock today’s catch-up slot with SEO owner.",
          taskTitle: "Backfill overdue SEO recommendations",
        },
      ],
      tasks: [
        {
          title: "Ship weekly analytics summary",
          section: "Incelemede",
          status: "IN_REVIEW",
          priority: "HIGH",
          dueDate: daysFromNow(1),
          assigneeId: memberIndex.opsLead,
          milestoneKey: "weekly-report",
          labels: ["Reporting"],
        },
        {
          title: "Refresh paid media landing variants",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: daysFromNow(2),
          assigneeId: memberIndex.designer,
          milestoneKey: "weekly-report",
          labels: ["Creative"],
        },
        {
          title: "Backfill overdue SEO recommendations",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(-2),
          assigneeId: memberIndex.deliveryManager,
          milestoneKey: "weekly-report",
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
      visibility: "PRIVATE",
      priority: "MEDIUM",
      tags: ["Internal", "Operations"],
      ownerId: workspace.ownerId,
      clientId: null,
      startDate: daysFromNow(-22),
      dueDate: daysFromNow(11),
      milestones: [
        {
          key: "playbook-refresh",
          title: "Playbook refresh pack",
          description: "Operational templates and QA rhythm updates published.",
          ownerId: workspace.ownerId,
          status: "IN_PROGRESS",
          dueDate: daysFromNow(6),
        },
      ],
      risks: [
        {
          title: "Internal standards work is competing with client delivery",
          description: "The initiative is paused and may lose momentum against client workload.",
          status: "WATCH",
          impact: "MEDIUM",
          likelihood: "HIGH",
          ownerId: workspace.ownerId,
          dueDate: daysFromNow(5),
          mitigationPlan: "Reserve a protected weekly slot and keep scope limited to one template batch.",
          taskTitle: "Map recurring blockers from last 30 days",
        },
      ],
      tasks: [
        {
          title: "Define default weekly status report format",
          section: "Planlandi",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: daysFromNow(6),
          assigneeId: memberIndex.opsLead,
          milestoneKey: "playbook-refresh",
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
          milestoneKey: "playbook-refresh",
          labels: ["Template"],
        },
        {
          title: "Map recurring blockers from last 30 days",
          section: "Yurutmede",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          dueDate: daysFromNow(5),
          assigneeId: memberIndex.deliveryManager,
          milestoneKey: "playbook-refresh",
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
          visibility: blueprint.visibility,
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
          visibility: blueprint.visibility,
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
    const milestoneMap = {};

    for (const milestoneBlueprint of blueprint.milestones ?? []) {
      const existingMilestone = await prisma.milestone.findFirst({
        where: {
          projectId: project.id,
          title: milestoneBlueprint.title,
        },
      });

      const milestone = existingMilestone
        ? await prisma.milestone.update({
            where: { id: existingMilestone.id },
            data: {
              ownerId: milestoneBlueprint.ownerId,
              description: milestoneBlueprint.description,
              status: milestoneBlueprint.status,
              dueDate: milestoneBlueprint.dueDate,
            },
          })
        : await prisma.milestone.create({
            data: {
              projectId: project.id,
              ownerId: milestoneBlueprint.ownerId,
              title: milestoneBlueprint.title,
              description: milestoneBlueprint.description,
              status: milestoneBlueprint.status,
              dueDate: milestoneBlueprint.dueDate,
            },
          });

      milestoneMap[milestoneBlueprint.key] = milestone;
    }

    const taskMap = {};

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
            milestoneId: taskBlueprint.milestoneKey ? milestoneMap[taskBlueprint.milestoneKey]?.id ?? null : null,
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
      } else {
        task = await prisma.task.update({
          where: { id: task.id },
          data: {
            sectionId: sectionMap[taskBlueprint.section]?.id ?? null,
            milestoneId: taskBlueprint.milestoneKey ? milestoneMap[taskBlueprint.milestoneKey]?.id ?? null : null,
            description: `${blueprint.name} deliverable inside the Synorq demo workspace.`,
            status: taskBlueprint.status,
            priority: taskBlueprint.priority,
            assigneeId: taskBlueprint.assigneeId,
            order: index,
            dueDate: taskBlueprint.dueDate ?? null,
            completedAt: taskBlueprint.completedAt ?? null,
            labels: taskBlueprint.labels,
            estimatedH: 4 + index,
            loggedH: taskBlueprint.status === "DONE" ? 3 + index : Math.max(1, index),
          },
        });
      }

      taskMap[taskBlueprint.title] = task;

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

    for (const riskBlueprint of blueprint.risks ?? []) {
      const linkedTask = riskBlueprint.taskTitle ? taskMap[riskBlueprint.taskTitle] ?? null : null;
      const existingRisk = await prisma.risk.findFirst({
        where: {
          projectId: project.id,
          title: riskBlueprint.title,
        },
      });

      if (existingRisk) {
        await prisma.risk.update({
          where: { id: existingRisk.id },
          data: {
            ownerId: riskBlueprint.ownerId,
            taskId: linkedTask?.id ?? null,
            description: riskBlueprint.description,
            status: riskBlueprint.status,
            impact: riskBlueprint.impact,
            likelihood: riskBlueprint.likelihood,
            mitigationPlan: riskBlueprint.mitigationPlan,
            dueDate: riskBlueprint.dueDate,
          },
        });
      } else {
        await prisma.risk.create({
          data: {
            projectId: project.id,
            ownerId: riskBlueprint.ownerId,
            taskId: linkedTask?.id ?? null,
            title: riskBlueprint.title,
            description: riskBlueprint.description,
            status: riskBlueprint.status,
            impact: riskBlueprint.impact,
            likelihood: riskBlueprint.likelihood,
            mitigationPlan: riskBlueprint.mitigationPlan,
            dueDate: riskBlueprint.dueDate,
          },
        });
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
        milestones: {
          select: {
            id: true,
            title: true,
          },
          orderBy: { createdAt: "asc" },
        },
        risks: {
          select: {
            id: true,
            title: true,
          },
          orderBy: { createdAt: "asc" },
        },
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

      const firstMilestone = project.milestones[0];
      if (firstMilestone) {
        activityPayload.push({
          action: "milestone.created",
          userId: memberIndex.opsLead,
          projectId: project.id,
          createdAt: hoursAgo(9 - Math.min(activityPayload.length, 7)),
          metadata: {
            title: firstMilestone.title,
          },
        });
      }

      const firstRisk = project.risks[0];
      if (firstRisk) {
        activityPayload.push({
          action: "risk.created",
          userId: memberIndex.opsLead,
          projectId: project.id,
          createdAt: hoursAgo(8 - Math.min(activityPayload.length, 6)),
          metadata: {
            title: firstRisk.title,
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
