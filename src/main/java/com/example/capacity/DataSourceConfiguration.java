package com.example.capacity;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
public class DataSourceConfiguration {
    @Bean
    DataSource dataSource(EnvFileConfiguration.Settings settings) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setUrl(settings.get("postgresql.datasource.url"));
        dataSource.setUsername(settings.get("postgresql.datasource.username"));
        dataSource.setPassword(settings.get("postgresql.datasource.password"));
        try {
            dataSource.setDriverClassName(settings.get("postgresql.datasource.driver-class-name"));
        } catch (RuntimeException | LinkageError failure) {
            // Driver initialization may include credentials in its exception; do not attach the cause.
            throw new IllegalStateException("Database driver initialization failed.");
        }
        return dataSource;
    }
}
