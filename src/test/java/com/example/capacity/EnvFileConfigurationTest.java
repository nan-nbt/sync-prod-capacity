package com.example.capacity;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EnvFileConfigurationTest {
    @Test
    void loadsPostgresSettingsFromEnvFileWithoutPrintingValues() throws Exception {
        Path env = Files.createTempFile("capacity-test", ".env");
        try {
            Files.writeString(env, "POSTGRES_URL=jdbc:postgresql://localhost:5432/testdb\n"
                    + "POSTGRES_USERNAME=test_user\nPOSTGRES_PASSWORD=secret-marker\n"
                    + "POSTGRES_DRIVER_CLASS_NAME=org.postgresql.Driver\n");

            var settings = EnvFileConfiguration.read(env);

            assertEquals("jdbc:postgresql://localhost:5432/testdb", settings.get("postgresql.datasource.url"));
            assertEquals("test_user", settings.get("postgresql.datasource.username"));
            assertEquals("secret-marker", settings.get("postgresql.datasource.password"));
            assertEquals("org.postgresql.Driver", settings.get("postgresql.datasource.driver-class-name"));
            org.junit.jupiter.api.Assertions.assertFalse(settings.toString().contains("secret-marker"));
        } finally {
            Files.deleteIfExists(env);
        }
    }

    @Test
    void readsConfiguredConnectionWithoutModifyingDatabase() throws Exception {
        EnvFileConfiguration.Settings settings = EnvFileConfiguration.read(Path.of(".env"));
        var values = settings.datasourceProperties();
        Class.forName(values.get("postgresql.datasource.driver-class-name"));
        try (Connection connection = DriverManager.getConnection(
                values.get("postgresql.datasource.url"), values.get("postgresql.datasource.username"),
                values.get("postgresql.datasource.password"))) {
            assertEquals(true, connection.isValid(5));
            try (var statement = connection.createStatement();
                 var result = statement.executeQuery("""
                         SELECT to_regclass('devuser.production_capacity') IS NOT NULL
                            AND to_regclass('devuser.production_capacity_anan') IS NOT NULL
                         """)) {
                result.next();
                assertEquals(true, result.getBoolean(1));
            }
        }
    }
}
