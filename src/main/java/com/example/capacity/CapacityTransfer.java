package com.example.capacity;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class CapacityTransfer {
    private static final String LOCK_TARGET = "LOCK TABLE devuser.production_capacity_anan IN SHARE ROW EXCLUSIVE MODE";
    private static final String SELECT_SOURCE = """
            SELECT id, plant_code, line_code, record_date, shift_type, target_qty,
                   actual_qty, defect_rate, line_status, remarks, created_at
            FROM devuser.production_capacity
            WHERE created_at >= ? AND created_at < ?
            ORDER BY id
            """;
    private static final RowMapper<CapacityRecord> RECORD_MAPPER = (result, row) -> new CapacityRecord(
            result.getLong("id"), result.getString("plant_code"), result.getString("line_code"),
            result.getObject("record_date", java.time.LocalDate.class), result.getString("shift_type"),
            result.getInt("target_qty"), result.getInt("actual_qty"), result.getBigDecimal("defect_rate"),
            result.getString("line_status"), result.getString("remarks"),
            result.getObject("created_at", OffsetDateTime.class).toInstant());

    private final JdbcTemplate jdbc;

    public CapacityTransfer(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public int transfer(DaysWindow window) {
        jdbc.execute(LOCK_TARGET);
        List<CapacityRecord> rows = jdbc.query(SELECT_SOURCE, RECORD_MAPPER,
                OffsetDateTime.ofInstant(window.startInclusive(), ZoneOffset.UTC),
                OffsetDateTime.ofInstant(window.endExclusive(), ZoneOffset.UTC));
        rejectDuplicateSourceKeys(rows);
        int changed = 0;
        for (CapacityRecord source : rows) {
            List<CapacityRecord> targets = findTargets(source);
            if (targets.size() > 1) throw new IllegalStateException("Multiple target rows match an eligible source key.");
            if (targets.isEmpty()) {
                insert(source);
                changed++;
            } else if (!sameValues(source, targets.getFirst())) {
                update(source);
                changed++;
            }
        }
        return changed;
    }

    private void rejectDuplicateSourceKeys(List<CapacityRecord> rows) {
        Set<BusinessKey> keys = new HashSet<>();
        for (CapacityRecord row : rows) {
            if (!keys.add(new BusinessKey(row.plantCode(), row.lineCode(), row.recordDate(), row.shiftType()))) {
                throw new IllegalStateException("Duplicate eligible source keys were found.");
            }
        }
    }

    private List<CapacityRecord> findTargets(CapacityRecord key) {
        return jdbc.query("""
                SELECT id, plant_code, line_code, record_date, shift_type, target_qty,
                       actual_qty, defect_rate, line_status, remarks, created_at
                FROM devuser.production_capacity_anan
                WHERE plant_code = ? AND line_code = ? AND record_date = ?
                  AND shift_type IS NOT DISTINCT FROM ?
                """, RECORD_MAPPER, key.plantCode(), key.lineCode(), key.recordDate(), key.shiftType());
    }

    private boolean sameValues(CapacityRecord left, CapacityRecord right) {
        return left.id() == right.id() && sameKey(left, right)
                && left.targetQty() == right.targetQty() && left.actualQty() == right.actualQty()
                && Objects.equals(left.defectRate(), right.defectRate())
                && Objects.equals(left.lineStatus(), right.lineStatus())
                && Objects.equals(left.remarks(), right.remarks())
                && left.createdAt().equals(right.createdAt());
    }

    private boolean sameKey(CapacityRecord left, CapacityRecord right) {
        return left.plantCode().equals(right.plantCode()) && left.lineCode().equals(right.lineCode())
                && left.recordDate().equals(right.recordDate()) && Objects.equals(left.shiftType(), right.shiftType());
    }

    private void insert(CapacityRecord row) {
        jdbc.update("""
                INSERT INTO devuser.production_capacity_anan
                (id, plant_code, line_code, record_date, shift_type, target_qty, actual_qty,
                 defect_rate, line_status, remarks, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date_trunc('milliseconds', clock_timestamp()))
                """, row.id(), row.plantCode(), row.lineCode(), row.recordDate(), row.shiftType(), row.targetQty(),
                row.actualQty(), row.defectRate(), row.lineStatus(), row.remarks(), OffsetDateTime.ofInstant(row.createdAt(), ZoneOffset.UTC));
    }

    private void update(CapacityRecord row) {
        jdbc.update("""
                UPDATE devuser.production_capacity_anan
                SET id = ?, target_qty = ?, actual_qty = ?, defect_rate = ?, line_status = ?, remarks = ?,
                    created_at = ?, updated_at = date_trunc('milliseconds', clock_timestamp())
                WHERE plant_code = ? AND line_code = ? AND record_date = ?
                  AND shift_type IS NOT DISTINCT FROM ?
                """, row.id(), row.targetQty(), row.actualQty(), row.defectRate(), row.lineStatus(), row.remarks(),
                OffsetDateTime.ofInstant(row.createdAt(), ZoneOffset.UTC), row.plantCode(), row.lineCode(), row.recordDate(), row.shiftType());
    }

    private record BusinessKey(String plantCode, String lineCode, java.time.LocalDate recordDate, String shiftType) { }
    private record CapacityRecord(long id, String plantCode, String lineCode, java.time.LocalDate recordDate,
                                  String shiftType, int targetQty, int actualQty, java.math.BigDecimal defectRate,
                                  String lineStatus, String remarks, Instant createdAt) { }
}
