import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// The surrounding button/status supplies the accessible loading text.
export const Spinner = ({ className }: { className?: string }) => (
  <LoaderCircle
    aria-hidden="true"
    data-slot="spinner"
    className={cn("size-4 shrink-0", className)}
  />
);
