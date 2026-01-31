import { differenceInMonths } from "date-fns";

// --- Helper: Calculate Annual Leave Entitlement (Anniversary-Based) ---
// Logic:
// - Leave does NOT carry over between years.
// - Before 1-year anniversary: Accrue 1 day per month worked in the CURRENT year.
// - After 1-year anniversary: Full 12 days for the current year.
export const calculateEntitlement = (user: any, targetDate: Date = new Date()) => {
    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth(); // 0-11

    // Default to 12 if no startDate
    if (!user.start_date && !user.startDate && !user.createdAt) return 12;

    let dateStr = user.start_date || user.startDate || user.createdAt;
    let start = new Date(dateStr);

    // Try parsing DD/MM/YYYY if standard parse invalid
    if (isNaN(start.getTime()) && typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // DD/MM/YYYY -> YYYY-MM-DD
            start = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }

    if (isNaN(start.getTime())) return 12; // Invalid date fallback

    // Calculate Anniversary Date (1 year after start)
    const anniversaryDate = new Date(start);
    anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);

    // If target date is on or after the 1-year anniversary: Full 12 days
    // Note: This logic assumes we are looking at the *current year of the target date*.
    // If target date is 2026, and anniversary is 2026, then after anniversary -> 12.

    // Check if targetDate is after anniversary in the target Year?
    // Actually, "After 1 year anniversary" means *any time* after the first year completed? 
    // Usually "Full 12 days" applies to the *calendar year* if you have > 12 months seniority?
    // User says: "đến qua thời điểm 10/5/2026... mới cho bạn full 12 tháng".
    // This implies that from Jan 1, 2026 to May 10, 2026, they are still accruing.
    // AFTER May 10, 2026, they get the full 12 (or remaining balance of 12).

    // So:
    // If (targetDate >= anniversaryDate) return 12; 
    // This looks simple and correct for recent employees.

    if (targetDate >= anniversaryDate) {
        return 12;
    }

    // Before anniversary (and assuming we are not carrying over):
    // Accrue 1 day per month worked in the CURRENT CALENDAR YEAR of the targetDate.

    const startYearInCurrent = start.getFullYear() === currentYear;
    const startMonthInYear = startYearInCurrent ? start.getMonth() : 0; // If joined previous year, count from Jan (0)

    // Check if employment started after the target month (impossible if targetDate > startDate, but safety check)
    if (startYearInCurrent && start.getMonth() > currentMonth) {
        return 0;
    }

    const monthsWorkedThisYear = currentMonth - startMonthInYear + 1;
    return Math.min(12, Math.max(0, monthsWorkedThisYear));
};
