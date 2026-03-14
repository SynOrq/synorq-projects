import type { Prisma } from "@prisma/client";

const taskUserSelect = {
  id: true,
  name: true,
  image: true,
  email: true,
} as const;

export const taskCardInclude = {
  assignee: { select: { id: true, name: true, image: true } },
  creator: { select: { id: true, name: true } },
  _count: { select: { comments: true, subTasks: true } },
} satisfies Prisma.TaskInclude;

export const taskDetailInclude = {
  ...taskCardInclude,
  attachments: {
    orderBy: { createdAt: "desc" },
  },
  comments: {
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: taskUserSelect },
    },
  },
  subTasks: {
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: taskCardInclude,
  },
} satisfies Prisma.TaskInclude;

export const taskActivityInclude = {
  user: { select: taskUserSelect },
} satisfies Prisma.ActivityLogInclude;

export type TaskCardData = Prisma.TaskGetPayload<{
  include: typeof taskCardInclude;
}>;

export type TaskDetailData = Prisma.TaskGetPayload<{
  include: typeof taskDetailInclude;
}>;

export type TaskActivityData = Prisma.ActivityLogGetPayload<{
  include: typeof taskActivityInclude;
}>;

export type TaskActivityChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

export type TaskActivityMetadata = {
  taskId?: string;
  projectId?: string;
  attachmentId?: string;
  changes?: TaskActivityChange[];
  commentId?: string;
  field?: string;
  fromSectionName?: string | null;
  name?: string;
  role?: string;
  roleFrom?: string | null;
  roleTo?: string | null;
  status?: string;
  subTaskId?: string;
  targetUserEmail?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  title?: string;
  toSectionName?: string | null;
  clientName?: string | null;
  preferenceKeys?: string[];
};

export type TaskDetailResponse = TaskDetailData & {
  activity: TaskActivityData[];
};
