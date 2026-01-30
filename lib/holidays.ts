import { getYear, getMonth, getDate, getDay } from "date-fns";
import { WorkScheduleType, CustomHoliday } from "@/context/AppContext";

// Hardcoded Lunar Holidays converted to Solar Date for simplicity (2024-2026)
// This is a simplified list. ideally this would fetch from an API or use a lunar calendar library.
export const LUNAR_HOLIDAYS_SOLAR: Record<number, string[]> = {
    2024: [
        "2024-02-08", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12", "2024-02-13", "2024-02-14", // Tet Holiday (approx)
        "2024-04-18", // Hung Kings (10/3 Lunar)
    ],
    2025: [
        "2025-01-25", "2025-01-26", "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", // Tet Holiday (approx range)
        "2025-04-07", // Hung Kings
    ],
    2026: [
        "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", // Tet Holiday
        "2026-04-26", // Hung Kings (10/3 Lunar)
    ],
    2027: [
        "2027-02-05", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", // Tet Holiday
        "2027-04-15", // Hung Kings (10/3 Lunar)
    ]
};

export const FIXED_HOLIDAYS = [
    { month: 0, date: 1, name: "Tết Dương Lịch" }, // Jan 1
    { month: 3, date: 30, name: "Ngày Giải phóng" }, // Apr 30 (Month is 0-indexed in Date? No, let's use 1-indexed for helper or match date-fns)
    { month: 4, date: 1, name: "Quốc tế Lao động" }, // May 1
    { month: 8, date: 2, name: "Quốc khánh" }, // Sep 2
    { month: 8, date: 3, name: "Quốc khánh (nghỉ bù)" }, // Sep 3 (Often included)
];

/**
 * Checks if a date is a Vietnamese public holiday
 */
export function isHoliday(date: Date, customHolidays: CustomHoliday[] = []): string | null {
    const year = getYear(date);
    const month = getMonth(date); // 0-indexed
    const day = getDate(date);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 1. Check Custom Holidays (Priority)
    const custom = customHolidays.find(h => h.date === dateStr);
    if (custom) return custom.name;

    // 2. Check Fixed Holidays
    for (const h of FIXED_HOLIDAYS) {
        if (h.month === month && h.date === day) {
            return h.name;
        }
    }

    // 3. Check Lunar Holidays (Hardcoded)
    if (LUNAR_HOLIDAYS_SOLAR[year]?.includes(dateStr)) {
        return "Nghỉ Lễ/Tết";
    }

    return null;
}

/**
 * Checks if a date is a working day based on the schedule
 * @param date The date to check
 * @param schedule The work schedule type
 */
export function isWorkDay(date: Date, schedule: WorkScheduleType = 'mon-fri'): boolean {
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

    if (dayOfWeek === 0) return false; // Sunday always off

    if (dayOfWeek === 6) {
        if (schedule === 'mon-fri') return false;
        // For mon-sat and mon-sat-morning, Saturday is a working day (partial logic handled by consumer)
        return true;
    }

    return true; // Mon-Fri are working days
}
