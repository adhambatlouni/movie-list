import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Pagination = ({ className, ...props }: ComponentProps<"nav">) => (
  <nav
    aria-label="Pagination"
    className={cn("flex justify-center", className)}
    {...props}
  />
);

export const PaginationContent = ({
  className,
  ...props
}: ComponentProps<"ul">) => (
  <ul className={cn("flex items-center gap-1", className)} {...props} />
);

export const PaginationItem = (props: ComponentProps<"li">) => (
  <li {...props} />
);

type PaginationLinkProps = ComponentProps<"a"> & { isActive?: boolean };

export const PaginationLink = ({
  className,
  isActive,
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({ variant: isActive ? "outline" : "ghost", size: "icon" }),
      "aria-disabled:pointer-events-none aria-disabled:opacity-40",
      className,
    )}
    {...props}
  />
);

export const PaginationPrevious = (props: PaginationLinkProps) => (
  <PaginationLink aria-label="Go to previous page" {...props}>
    <ChevronLeft aria-hidden="true" />
  </PaginationLink>
);

export const PaginationNext = (props: PaginationLinkProps) => (
  <PaginationLink aria-label="Go to next page" {...props}>
    <ChevronRight aria-hidden="true" />
  </PaginationLink>
);
