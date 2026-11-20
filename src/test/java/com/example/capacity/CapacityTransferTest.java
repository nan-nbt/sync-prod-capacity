package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.lang.reflect.Constructor;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CapacityTransferTest {
    private final DaysWindow window = new DaysWindow(Instant.parse("2026-11-12T16:00:00Z"),
            Instant.parse("2026-11-17T16:00:00Z"));

    @Test
    void insertsEligibleSourceWhenBusinessKeyHasNoTarget() throws Exception {
        JdbcTemplate jdbc = jdbc(source(41, "P1", "L1", "DAY", "remarks"), List.of());
        CapacityTransfer transfer = new CapacityTransfer(jdbc);

        assertEquals(1, transfer.transfer(window));
        verifySourceSelectIsBoundToWindow(jdbc);
        verify(jdbc).update(argThat(sql -> sql.contains("INSERT INTO devuser.production_capacity_anan")
                        && sql.contains("date_trunc('milliseconds', clock_timestamp())")),
                eq(41L), eq("P1"), eq("L1"), eq(LocalDate.of(2026, 11, 16)), eq("DAY"),
                eq(100), eq(95), eq(new BigDecimal("1.25")), eq("ACTIVE"), eq("remarks"), any());
        verify(jdbc, never()).update(startsWith("UPDATE devuser.production_capacity_anan"), any(Object[].class));
    }

    @Test
    void leavesMatchingIdenticalTargetUnchangedAndReturnsZero() throws Exception {
        Object record = source(41, "P1", "L1", null, "remarks");
        JdbcTemplate jdbc = jdbc(record, List.of(record));
        CapacityTransfer transfer = new CapacityTransfer(jdbc);

        assertEquals(0, transfer.transfer(window));
        assertEquals(0, transfer.transfer(window));
        verify(jdbc, times(2)).query(contains("FROM devuser.production_capacity\n"), any(RowMapper.class), any(Object[].class));
        verify(jdbc, never()).update(startsWith("INSERT INTO devuser.production_capacity_anan"), any(Object[].class));
        verify(jdbc, never()).update(startsWith("UPDATE devuser.production_capacity_anan"), any(Object[].class));
    }

    @Test
    void updatesMatchingTargetWhenSynchronizedValueDiffers() throws Exception {
        Object source = source(41, "P1", "L1", null, "new remarks");
        Object target = source(41, "P1", "L1", null, "old remarks");
        JdbcTemplate jdbc = jdbc(source, List.of(target));
        CapacityTransfer transfer = new CapacityTransfer(jdbc);

        assertEquals(1, transfer.transfer(window));
        verify(jdbc).update(argThat(sql -> sql.contains("UPDATE devuser.production_capacity_anan")
                        && sql.contains("date_trunc('milliseconds', clock_timestamp())")),
                eq(41L), eq(100), eq(95), eq(new BigDecimal("1.25")), eq("ACTIVE"),
                eq("new remarks"), any(), eq("P1"), eq("L1"), eq(LocalDate.of(2026, 11, 16)), isNull());
        verify(jdbc, never()).update(startsWith("INSERT INTO devuser.production_capacity_anan"), any(Object[].class));
    }

    @Test
    void rejectsMultipleMatchingTargetsBeforeAnyWrite() throws Exception {
        Object record = source(41, "P1", "L1", null, "remarks");
        JdbcTemplate jdbc = jdbc(record, List.of(record, source(42, "P1", "L1", null, "remarks")));
        CapacityTransfer transfer = new CapacityTransfer(jdbc);

        assertThrows(IllegalStateException.class, () -> transfer.transfer(window));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsDuplicateEligibleNullShiftSourceKeysBeforeTargetWrites() throws Exception {
        Object first = source(41, "P1", "L1", null, "remarks");
        Object second = source(42, "P1", "L1", null, "remarks");
        JdbcTemplate jdbc = jdbc(List.of(first, second), List.of());
        CapacityTransfer transfer = new CapacityTransfer(jdbc);

        assertThrows(IllegalStateException.class, () -> transfer.transfer(window));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    private static void verifySourceSelectIsBoundToWindow(JdbcTemplate jdbc) {
        verify(jdbc).query(contains("FROM devuser.production_capacity\n"), any(RowMapper.class),
                eq(java.time.OffsetDateTime.parse("2026-11-12T16:00:00Z")),
                eq(java.time.OffsetDateTime.parse("2026-11-17T16:00:00Z")));
    }

    private static JdbcTemplate jdbc(Object source, List<Object> targets) {
        return jdbc(List.of(source), targets);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static JdbcTemplate jdbc(List<Object> sources, List<Object> targets) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            return sql.contains("FROM devuser.production_capacity\n") ? sources : targets;
        });
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        return jdbc;
    }

    private static Object source(long id, String plant, String line, String shift, String remarks) throws Exception {
        Class<?> type = Class.forName("com.example.capacity.CapacityTransfer$CapacityRecord");
        Constructor<?> constructor = type.getDeclaredConstructors()[0];
        constructor.setAccessible(true);
        return constructor.newInstance(id, plant, line, LocalDate.of(2026, 11, 16), shift,
                100, 95, new BigDecimal("1.25"), "ACTIVE", remarks, Instant.parse("2026-11-16T01:00:00Z"));
    }
}
