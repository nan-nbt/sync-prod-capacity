package com.example.capacity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CapacityApplicationTest {
    @Test
    void invalidArgumentsReturnErrorBeforeStartingSpringContext() {
        assertEquals(2, CapacityApplication.run(new String[]{"--days=0"}));
    }
}
