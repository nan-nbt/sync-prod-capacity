package com.example.capacity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CapacityApplicationTest {
    @Test
    void invalidArgumentsReturnErrorBeforeStartingSpringContext() {
        assertEquals(2, CapacityApplication.run(new String[]{"--days=0"}));
    }

    @Test
    void successMessageReportsNumberOfRowsInsertedOrUpdated() {
        assertEquals("Transfer completed successfully. Total rows successfully transferred: 7.",
                CapacityApplication.successMessage(7));
        assertEquals("Transfer completed successfully. Total rows successfully transferred: 0.",
                CapacityApplication.successMessage(0));
        assertEquals("Transfer completed successfully. Total row successfully transferred: 1.",
                CapacityApplication.successMessage(1));
    }
}
