import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
};

const colors = [
  "bg-indigo-500", "bg-violet-500", "bg-cyan-500",
  "bg-emerald-500", "bg-orange-500", "bg-pink-500",
];

function getColor(name: string) {
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function Avatar({ name, image, size = "md", className }: AvatarProps) {
  const displayName = name ?? "?";
  const initials = getInitials(displayName);
  const color = getColor(displayName);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 overflow-hidden",
        sizeMap[size],
        !image && color,
        className
      )}
      title={displayName}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

export function AvatarGroup({
  users,
  max = 3,
  size = "sm",
}: {
  users: Array<{ name?: string | null; image?: string | null }>;
  max?: number;
  size?: AvatarProps["size"];
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((u, i) => (
        <Avatar key={i} name={u.name} image={u.image} size={size} className="ring-2 ring-white" />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 ring-2 ring-white",
            sizeMap[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
