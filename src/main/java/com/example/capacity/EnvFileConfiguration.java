package com.example.capacity;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

final class EnvFileConfiguration {
    private EnvFileConfiguration() { }

    static Settings read(Path path) throws IOException {
        Map<String, String> values = new LinkedHashMap<>();
        for (String line : Files.readAllLines(path)) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
            int separator = trimmed.indexOf('=');
            if (separator < 1) throw new IllegalArgumentException("Invalid .env entry.");
            String key = trimmed.substring(0, separator).trim();
            String value = trimmed.substring(separator + 1).trim();
            if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\""))
                    || (value.startsWith("'") && value.endsWith("'")))) {
                value = value.substring(1, value.length() - 1);
            }
            values.put(key, value);
        }
        return new Settings(values);
    }

    static final class Settings {
        private final Map<String, String> source;
        private final Map<String, String> datasource;

        private Settings(Map<String, String> source) {
            this.source = Map.copyOf(source);
            this.datasource = Map.of(
                    "postgresql.datasource.url", require("POSTGRES_URL"),
                    "postgresql.datasource.username", require("POSTGRES_USERNAME"),
                    "postgresql.datasource.password", require("POSTGRES_PASSWORD"),
                    "postgresql.datasource.driver-class-name", require("POSTGRES_DRIVER_CLASS_NAME"));
        }

        private String require(String name) {
            String value = source.get(name);
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("Missing required .env setting: " + name);
            }
            return value;
        }

        Map<String, String> datasourceProperties() { return datasource; }

        String get(String key) { return datasource.get(key); }

        @Override
        public String toString() { return "Database settings loaded [values redacted]"; }
    }
}
