package com.example.capacity;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class CapacityConfigurationLoadingTest {
    @Test
    void documentedConfigurationFileIsAvailableAtExpectedLocation() {
        assertTrue(Files.isRegularFile(Path.of("docs", "application.yml")));
    }
}
