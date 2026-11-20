package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DataSourceConfigurationTest {
    @TempDir
    Path directory;

    @Test
    void mapsEnvSettingsToDatasourceWithoutResolvingOrPrintingPassword() throws Exception {
        Path env = directory.resolve(".env");
        Files.writeString(env, "POSTGRES_URL=jdbc:postgresql://localhost:5432/testdb\n"
                + "POSTGRES_USERNAME=test_user\nPOSTGRES_PASSWORD=${synthetic-password}\n"
                + "POSTGRES_DRIVER_CLASS_NAME=org.postgresql.Driver\n");
        var settings = EnvFileConfiguration.read(env);

        var dataSource = (DriverManagerDataSource) new DataSourceConfiguration().dataSource(settings);

        assertEquals("jdbc:postgresql://localhost:5432/testdb", dataSource.getUrl());
        assertEquals("test_user", dataSource.getUsername());
        assertEquals("${synthetic-password}", dataSource.getPassword());
        assertFalse(settings.toString().contains("synthetic-password"));
    }
}
