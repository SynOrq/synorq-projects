import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseCapacityNumber(
  value: unknown,
  fieldLabel: string,
  {
    allowNull = false,
    fallbackValue,
  }: {
    allowNull?: boolean;
    fallbackValue?: number | null;
  } = {}
) {
  if (value === undefined) {
    return { value: fallbackValue ?? null };
  }

  if (allowNull && (value === null || value === "")) {
    return { value: null };
  }

  if (!allowNull && (value === null || value === "")) {
    return { value: 0 };
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 80) {
    return { error: `${fieldLabel} 0 ile 80 arasinda olmali.` };
  }

  return { value: Math.round(parsed) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const roleInput = hasOwn(body, "role") ? body.role : undefined;
    const wantsRoleUpdate = roleInput !== undefined;
    const role = typeof roleInput === "string" ? roleInput.toUpperCase() : "";
    const wantsCapacityUpdate =
      hasOwn(body, "weeklyCapacityHours") || hasOwn(body, "reservedHours") || hasOwn(body, "outOfOfficeHours");

    if (!wantsRoleUpdate && !wantsCapacityUpdate) {
      return NextResponse.json({ error: "Guncellenecek alan bulunamadi." }, { status: 400 });
    }

    if (wantsRoleUpdate && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
    }

    const workspace = await db.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace bulunamadı." }, { status: 404 });
    }

    const currentRole = workspace.members[0]?.role;
    const canManageMembers = workspace.ownerId === session.user.id || currentRole === "ADMIN";
    if (!canManageMembers) {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekir." }, { status: 403 });
    }

    const { memberId } = await params;
    const member = await db.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: workspace.id,
      },
      include: {
        capacityProfile: {
          select: {
            weeklyCapacityHours: true,
            reservedHours: true,
            outOfOfficeHours: true,
          },
        },
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    }

    if (wantsRoleUpdate && member.userId === workspace.ownerId) {
      return NextResponse.json({ error: "Workspace sahibi rolü değiştirilemez." }, { status: 400 });
    }

    if (wantsRoleUpdate && member.userId === session.user.id) {
      return NextResponse.json({ error: "Kendi rolünüzü bu panelden değiştiremezsiniz." }, { status: 400 });
    }

    const currentCapacity = member.capacityProfile ?? {
      weeklyCapacityHours: null,
      reservedHours: 0,
      outOfOfficeHours: 0,
    };

    const weeklyCapacityHoursResult = parseCapacityNumber(body.weeklyCapacityHours, "Weekly capacity", {
      allowNull: true,
      fallbackValue: currentCapacity.weeklyCapacityHours,
    });
    if (weeklyCapacityHoursResult.error) {
      return NextResponse.json({ error: weeklyCapacityHoursResult.error }, { status: 400 });
    }

    const reservedHoursResult = parseCapacityNumber(body.reservedHours, "Reserve hours", {
      fallbackValue: currentCapacity.reservedHours,
    });
    if (reservedHoursResult.error) {
      return NextResponse.json({ error: reservedHoursResult.error }, { status: 400 });
    }

    const outOfOfficeHoursResult = parseCapacityNumber(body.outOfOfficeHours, "Out-of-office hours", {
      fallbackValue: currentCapacity.outOfOfficeHours,
    });
    if (outOfOfficeHoursResult.error) {
      return NextResponse.json({ error: outOfOfficeHoursResult.error }, { status: 400 });
    }

    const nextCapacity = {
      weeklyCapacityHours: weeklyCapacityHoursResult.value,
      reservedHours: reservedHoursResult.value ?? 0,
      outOfOfficeHours: outOfOfficeHoursResult.value ?? 0,
    };

    const updatedMember = await db.workspaceMember.update({
      where: { id: member.id },
      data: {
        ...(wantsRoleUpdate ? { role: role as "ADMIN" | "MEMBER" | "VIEWER" } : {}),
        ...(wantsCapacityUpdate
          ? {
              capacityProfile: {
                upsert: {
                  update: nextCapacity,
                  create: nextCapacity,
                },
              },
            }
          : {}),
      },
      include: {
        capacityProfile: {
          select: {
            weeklyCapacityHours: true,
            reservedHours: true,
            outOfOfficeHours: true,
          },
        },
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      },
    });

    if (wantsRoleUpdate) {
      await db.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId: session.user.id,
          action: "workspace.member.role_updated",
          metadata: {
            memberId: member.id,
            targetUserId: member.userId,
            targetUserEmail: member.user.email,
            targetUserName: member.user.name,
            roleFrom: member.role,
            roleTo: role,
            role,
          },
        },
      });
    }

    if (wantsCapacityUpdate) {
      await db.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId: session.user.id,
          action: "workspace.member.capacity_updated",
          metadata: {
            memberId: member.id,
            targetUserId: member.userId,
            targetUserEmail: member.user.email,
            targetUserName: member.user.name,
            weeklyCapacityHoursFrom: currentCapacity.weeklyCapacityHours,
            weeklyCapacityHoursTo: nextCapacity.weeklyCapacityHours,
            reservedHoursFrom: currentCapacity.reservedHours,
            reservedHoursTo: nextCapacity.reservedHours,
            outOfOfficeHoursFrom: currentCapacity.outOfOfficeHours,
            outOfOfficeHoursTo: nextCapacity.outOfOfficeHours,
          },
        },
      });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (err) {
    console.error("[workspace/members/[memberId]/PATCH]", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
