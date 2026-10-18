"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;

export const AccordionTrigger = ({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) => (
  <AccordionPrimitive.Header asChild>
    <h4 className="flex shrink-0 self-stretch">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex min-h-11 items-center gap-2 rounded text-sm font-medium text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          data-slot="accordion-chevron"
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform duration-250 ease-in-out"
        />
      </AccordionPrimitive.Trigger>
    </h4>
  </AccordionPrimitive.Header>
);

export const AccordionContent = ({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) => (
  <AccordionPrimitive.Content
    data-slot="accordion-content"
    className="overflow-hidden text-sm leading-6 text-muted-foreground duration-250 ease-in-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
    {...props}
  >
    <div className={cn("pb-2 whitespace-pre-wrap wrap-anywhere", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
);
