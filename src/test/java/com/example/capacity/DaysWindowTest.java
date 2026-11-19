package com.example.capacity;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DaysWindowTest {
    @Test
    void calculatesInclusiveCalendarWindowFromFixedUtcPlusEightRunDate() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=5"},
                Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC));

        assertEquals(Instant.parse("2026-11-11T16:00:00Z"), window.startInclusive());
        assertEquals(Instant.parse("2026-11-16T16:00:00Z"), window.endExclusive());
    }

    @Test
    void handlesMonthYearAndLeapDayCalendarBoundaries() {
        DaysWindow leapDay = DaysWindow.parse(new String[]{"--days=2"},
                Clock.fixed(Instant.parse("2024-02-29T12:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2024-02-27T16:00:00Z"), leapDay.startInclusive());
        assertEquals(Instant.parse("2024-02-29T16:00:00Z"), leapDay.endExclusive());

        DaysWindow year = DaysWindow.parse(new String[]{"--days=1"},
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2025-12-31T16:00:00Z"), year.startInclusive());
        assertEquals(Instant.parse("2026-01-01T16:00:00Z"), year.endExclusive());
    }

    @Test
    void rejectsWindowOutsidePostgresRepresentableRange() {
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(
                new String[]{"--days=999999999"},
                Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC)));
    }

    @Test
    void acceptsLeadingZeroPositiveDayCount() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=01"},
                Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC));

        assertEquals(Instant.parse("2026-11-15T16:00:00Z"), window.startInclusive());
        assertEquals(Instant.parse("2026-11-16T16:00:00Z"), window.endExclusive());
    }

    @Test
    void rejectsMissingRepeatedAndInvalidDayArguments() {
        Clock clock = Clock.systemUTC();
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(new String[0], clock));
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(new String[]{"--days=1", "--days=2"}, clock));
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(new String[]{"--days=+1"}, clock));
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(new String[]{"--days=0"}, clock));
        assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(new String[]{"--days=99999999999999999999"}, clock));
    }
}
