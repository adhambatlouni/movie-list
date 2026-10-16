import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const Skeleton = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="skeleton"
    className={cn(
      "animate-pulse rounded-md bg-primary/10 motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
);

export { Skeleton };
