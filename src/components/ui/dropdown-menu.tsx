"use client";

import * as React from "react";
import * as Dd from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const DropdownMenu = Dd.Root;
export const DropdownMenuTrigger = Dd.Trigger;
export const DropdownMenuGroup = Dd.Group;
export const DropdownMenuRadioGroup = Dd.RadioGroup;
export const DropdownMenuPortal = Dd.Portal;
export const DropdownMenuSub = Dd.Sub;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Dd.Content>,
  React.ComponentPropsWithoutRef<typeof Dd.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Dd.Portal>
    <Dd.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-bg-elev p-1 text-text shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  </Dd.Portal>
));
DropdownMenuContent.displayName = Dd.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Dd.Item>,
  React.ComponentPropsWithoutRef<typeof Dd.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Dd.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
      "focus:bg-bg-elev-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = Dd.Item.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof Dd.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof Dd.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <Dd.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-bg-elev-2",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Dd.ItemIndicator>
        <Check className="h-4 w-4" />
      </Dd.ItemIndicator>
    </span>
    {children}
  </Dd.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = Dd.CheckboxItem.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof Dd.Label>,
  React.ComponentPropsWithoutRef<typeof Dd.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Dd.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-semibold uppercase text-text-muted", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = Dd.Label.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof Dd.Separator>,
  React.ComponentPropsWithoutRef<typeof Dd.Separator>
>(({ className, ...props }, ref) => (
  <Dd.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
DropdownMenuSeparator.displayName = Dd.Separator.displayName;

export { ChevronRight };
