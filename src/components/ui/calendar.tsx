"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Determine if we are in dropdown mode to prevent duplication of month/year text
  const isDropdown = props.captionLayout === "dropdown" || props.captionLayout === "dropdown-buttons"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-card", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-12 w-full mb-4",
        
        // Hide the static caption label if dropdowns are enabled to prevent duplication
        caption_label: cn(
          "text-sm font-bold text-primary flex items-center h-7",
          isDropdown && "hidden"
        ),
        
        // Ensure dropdowns are centered and aligned side-by-side horizontally
        dropdowns: "flex items-center justify-center gap-2 z-20",
        
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-30 absolute left-1 top-1 rounded-full border-none shadow-none hover:bg-primary/5"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-30 absolute right-1 top-1 rounded-full border-none shadow-none hover:bg-primary/5"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full justify-between",
        weekday: "text-muted-foreground font-bold text-[10px] uppercase tracking-widest text-center w-9 h-9 flex items-center justify-center",
        week: "flex w-full justify-between mt-1",
        day: "relative p-0 text-center text-sm flex justify-center items-center w-9 h-9",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-primary/10 transition-colors rounded-lg flex items-center justify-center"
        ),
        range_end: "day-range-end",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-lg",
        today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/20 rounded-lg",
        outside: "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        
        // Select styling for dropdown mode
        dropdown: "bg-transparent font-bold text-sm text-primary cursor-pointer hover:bg-primary/5 px-2 py-1 rounded transition-colors focus:outline-none appearance-none border-none outline-none inline-flex items-center",
        dropdown_month: "relative inline-flex items-center",
        dropdown_year: "relative inline-flex items-center",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />
          return <ChevronRight className="h-4 w-4" />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
