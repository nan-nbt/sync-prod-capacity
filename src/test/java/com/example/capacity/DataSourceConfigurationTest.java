package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DataSourceConfigurationTest {
    @Test
    void bindsCustomPostgresqlDatasourcePropertiesWithoutPrintingPassword() {
        var source = new MapConfigurationPropertySource(Map.of(
                "postgresql.datasource.url", "jdbc:postgresql://localhost:5432/testdb",
                "postgresql.datasource.username", "test_user",
                "postgresql.datasource.password", "secret-marker",
                "postgresql.datasource.driver-class-name", "org.postgresql.Driver"));

        var properties = new Binder(source).bind("postgresql.datasource",
                Bindable.of(DataSourceConfiguration.PostgresqlDataSourceProperties.class)).get();

        assertEquals("jdbc:postgresql://localhost:5432/testdb", properties.getUrl());
        assertEquals("test_user", properties.getUsername());
        assertEquals("secret-marker", properties.getPassword());
        assertEquals("org.postgresql.Driver", properties.getDriverClassName());
        assertFalse(properties.toString().contains("secret-marker"));
    }
}
