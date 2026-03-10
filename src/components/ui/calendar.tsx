
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
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-card", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9 mb-2",
        caption_label: "text-sm font-bold font-headline text-primary capitalize flex items-center gap-1",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 z-10 border-primary/10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 z-10 border-primary/10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-2",
        weekday:
          "text-muted-foreground rounded-md w-9 font-bold text-[10px] uppercase tracking-wider text-center",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/5 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-primary/10 transition-colors rounded-lg"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-lg shadow-primary/20",
        today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/20",
        outside:
          "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        caption_dropdowns: "flex justify-center gap-1 items-center z-20",
        dropdown: "bg-transparent font-bold text-sm text-primary cursor-pointer hover:bg-primary/5 px-1 rounded transition-colors focus:outline-none appearance-none",
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
