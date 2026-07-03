"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface YearPickerProps {
  id?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  startYear?: number
  endYear?: number
}

export function YearPicker({ 
  id,
  value, 
  onChange, 
  placeholder = "选择年份",
  className,
  disabled = false,
  startYear = 1980,
  endYear = new Date().getFullYear()
}: YearPickerProps) {
  const years = React.useMemo(() => {
    const yearList = []
    for (let year = endYear; year >= startYear; year--) {
      yearList.push(year.toString())
    }
    return yearList
  }, [startYear, endYear])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        id={id}
        className={cn(
          "h-14 rounded-xl text-lg focus:border-green-500 focus:ring-green-500/20",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year}>
            {year}年
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 
