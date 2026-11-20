package com.example.capacity;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DaysWindowTest {
    @Test
    void calculatesInclusiveWindowForFiveDaysAtUtcPlusEight() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=5"},
                Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2026-11-11T16:00:00Z"), window.startInclusive());
        assertEquals(Instant.parse("2026-11-16T16:00:00Z"), window.endExclusive());
    }

    @Test
    void calculatesOneDayWindowAcrossMidnightAndCalendarBoundaries() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=1"},
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2025-12-31T16:00:00Z"), window.startInclusive());
        assertEquals(Instant.parse("2026-01-01T16:00:00Z"), window.endExclusive());
    }

    @Test
    void calculatesAcrossLeapDay() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=2"},
                Clock.fixed(Instant.parse("2024-02-29T12:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2024-02-27T16:00:00Z"), window.startInclusive());
        assertEquals(Instant.parse("2024-02-29T16:00:00Z"), window.endExclusive());
    }

    @Test
    void acceptsPositiveDayCountWithLeadingZeroes() {
        DaysWindow window = DaysWindow.parse(new String[]{"--days=01"},
                Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC));
        assertEquals(Instant.parse("2026-11-15T16:00:00Z"), window.startInclusive());
    }

    @Test
    void acceptsArbitrarilyManyLeadingZeroesWhenNumericValueIsRepresentable() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-15T16:00:00Z"), ZoneOffset.UTC);
        assertEquals(DaysWindow.parse(new String[]{"--days=1"}, clock),
                DaysWindow.parse(new String[]{"--days=00000000000000000000000001"}, clock));
    }

    @Test
    void rejectsInvalidDayArgumentsAndUnrepresentableValues() {
        Clock clock = Clock.systemUTC();
        for (String[] args : new String[][]{
                {}, {"--days=1", "--days=2"}, {"--days="}, {"--days=+1"},
                {"--days=-1"}, {"--days=0"}, {"--days=1.5"}, {"--days=abc"},
                {"--days=999999999999999999999"}, {"--days=999999999"}
        }) {
            assertThrows(IllegalArgumentException.class, () -> DaysWindow.parse(args, clock));
        }
    }
}
