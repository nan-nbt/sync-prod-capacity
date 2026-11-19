package com.example.capacity;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.DateTimeException;
import java.util.regex.Pattern;

public record DaysWindow(Instant startInclusive, Instant endExclusive) {
    private static final ZoneOffset OFFSET = ZoneOffset.ofHours(8);
    private static final Pattern DAYS_ARGUMENT = Pattern.compile("--days=([0-9]+)");
    private static final LocalDateTime POSTGRES_MIN = LocalDateTime.of(-4712, 1, 1, 0, 0);
    private static final LocalDateTime POSTGRES_MAX = LocalDateTime.of(294276, 12, 31, 23, 59, 59, 999999000);

    private static boolean isPostgresRepresentable(Instant instant) {
        LocalDateTime utc = LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
        return !utc.isBefore(POSTGRES_MIN) && !utc.isAfter(POSTGRES_MAX);
    }

    public static DaysWindow parse(String[] args, Clock clock) {
        if (args.length != 1) {
            throw new IllegalArgumentException("Provide exactly one --days=<positive integer> argument.");
        }
        var matcher = DAYS_ARGUMENT.matcher(args[0]);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("The --days value must contain decimal digits only.");
        }

        final long days;
        try {
            days = Long.parseLong(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("The --days value is outside the supported range.");
        }
        if (days < 1) {
            throw new IllegalArgumentException("The --days value must be positive.");
        }

        try {
            LocalDate runDate = LocalDate.now(clock.withZone(OFFSET));
            Instant start = runDate.minusDays(Math.subtractExact(days, 1))
                    .atStartOfDay().toInstant(OFFSET);
            Instant end = runDate.plusDays(1).atStartOfDay().toInstant(OFFSET);
            if (!isPostgresRepresentable(start) || !isPostgresRepresentable(end)) {
                throw new IllegalArgumentException("The --days window is outside the supported database timestamp range.");
            }
            return new DaysWindow(start, end);
        } catch (DateTimeException | ArithmeticException exception) {
            throw new IllegalArgumentException("The --days window is outside the supported date range.");
        }
    }
}
