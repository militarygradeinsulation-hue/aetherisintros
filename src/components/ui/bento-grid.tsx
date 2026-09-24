import * as React from "react";
import { cn } from "@/lib/utils";

const BentoGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
BentoGrid.displayName = "BentoGrid";

interface BentoGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}

const BentoGridItem = React.forwardRef<HTMLDivElement, BentoGridItemProps>(
  ({ className, title, description, header, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group row-span-1 flex flex-col justify-between space-y-4 overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        <div className="flex h-full min-h-[6rem] flex-1 overflow-hidden rounded-md bg-muted">
          {header}
        </div>
        <div className="transition-transform duration-200 group-hover:translate-x-1">
          <div className="font-sans text-sm font-bold text-card-foreground">
            {title}
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    );
  }
);
BentoGridItem.displayName = "BentoGridItem";

export { BentoGrid, BentoGridItem };