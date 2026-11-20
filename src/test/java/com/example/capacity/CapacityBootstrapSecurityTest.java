package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.DataInputStream;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CapacityBootstrapSecurityTest {
    private static final String URL_VALUE = "jdbc:synthetic:env-url-marker";
    private static final String USER_VALUE = "synthetic-env-user-marker";
    private static final String PASSWORD_VALUE = "${BOOTSTRAP_PLACEHOLDER}";
    private static final String FAILURE_MARKER = "synthetic-startup-secret-marker";

    @TempDir
    Path directory;

    @Test
    void bootstrapPreservesLiteralPasswordInsteadOfResolvingPlaceholder() throws Exception {
        writeEnv(RecordingDriver.class.getName(), PASSWORD_VALUE);
        Result result = invoke(false, false);

        assertEquals(1, result.exitCode());
        assertConnectionSettings(URL_VALUE, USER_VALUE, PASSWORD_VALUE);
        assertSafeOutput(result.output(), URL_VALUE, USER_VALUE, PASSWORD_VALUE, "synthetic-resolved-marker");
    }

    @Test
    void bootstrapIgnoresHigherPriorityDatasourceOverrides() throws Exception {
        writeEnv(RecordingDriver.class.getName(), PASSWORD_VALUE);
        Result result = invoke(true, true);

        assertEquals(1, result.exitCode());
        assertConnectionSettings(URL_VALUE, USER_VALUE, PASSWORD_VALUE);
        assertSafeOutput(result.output(), URL_VALUE, USER_VALUE, PASSWORD_VALUE, "synthetic-resolved-marker");
    }

    @Test
    void bootstrapIgnoresEnvironmentDatasourceOverrides() throws Exception {
        writeEnv(RecordingDriver.class.getName(), PASSWORD_VALUE);
        Result result = invoke(false, true);

        assertEquals(1, result.exitCode());
        assertConnectionSettings(URL_VALUE, USER_VALUE, PASSWORD_VALUE);
        assertSafeOutput(result.output(), URL_VALUE, USER_VALUE, PASSWORD_VALUE, "synthetic-resolved-marker");
    }

    @Test
    void startupFailureDoesNotLogDriverExceptionDetails() throws Exception {
        writeEnv(FailingDriver.class.getName(), FAILURE_MARKER);
        Result result = invoke(false, false);

        assertEquals(1, result.exitCode());
        assertTrue(result.output().contains("Application startup failed"));
        assertSafeOutput(result.output(), FAILURE_MARKER, URL_VALUE, USER_VALUE);
        assertFalse(Files.exists(directory.resolve("connection.bin")));
    }

    private void writeEnv(String driver, String password) throws IOException {
        Files.writeString(directory.resolve(".env"), "POSTGRES_URL=" + URL_VALUE + "\n"
                + "POSTGRES_USERNAME=" + USER_VALUE + "\nPOSTGRES_PASSWORD=" + password + "\n"
                + "POSTGRES_DRIVER_CLASS_NAME=" + driver + "\n");
    }

    private Result invoke(boolean systemOverrides, boolean environmentOverrides) throws Exception {
        List<String> command = new ArrayList<>();
        command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        command.add("-Dsynthetic.report=" + directory.resolve("connection.bin"));
        if (systemOverrides) {
            command.add("-Dpostgresql.datasource.url=jdbc:synthetic:system-override");
            command.add("-Dpostgresql.datasource.username=synthetic-system-user");
            command.add("-Dpostgresql.datasource.password=synthetic-system-password");
            command.add("-Dpostgresql.datasource.driver-class-name=" + RecordingDriver.class.getName());
        }
        command.add("-cp");
        command.add(runtimeClasspath());
        command.add(CapacityApplication.class.getName());
        command.add("--days=1");

        ProcessBuilder builder = new ProcessBuilder(command).directory(directory.toFile()).redirectErrorStream(true);
        builder.environment().clear();
        builder.environment().put("BOOTSTRAP_PLACEHOLDER", "synthetic-resolved-marker");
        if (environmentOverrides) {
            builder.environment().put("POSTGRESQL_DATASOURCE_URL", "jdbc:synthetic:environment-override");
            builder.environment().put("POSTGRESQL_DATASOURCE_USERNAME", "synthetic-environment-user");
            builder.environment().put("POSTGRESQL_DATASOURCE_PASSWORD", "synthetic-environment-password");
            builder.environment().put("POSTGRESQL_DATASOURCE_DRIVER_CLASS_NAME", RecordingDriver.class.getName());
        }
        Path output = directory.resolve("output.txt");
        builder.redirectOutput(output.toFile());
        Process process = builder.start();
        if (!process.waitFor(30, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new AssertionError("Bootstrap process timed out");
        }
        return new Result(process.exitValue(), Files.readString(output));
    }

    private static String runtimeClasspath() throws Exception {
        List<String> entries = new ArrayList<>();
        for (ClassLoader loader = CapacityBootstrapSecurityTest.class.getClassLoader(); loader != null; loader = loader.getParent()) {
            if (loader instanceof URLClassLoader urls) {
                for (URL url : urls.getURLs()) {
                    if (url.getProtocol().equals("file")) entries.add(Path.of(url.toURI()).toString());
                }
            }
        }
        entries.add(System.getProperty("java.class.path"));
        return String.join(System.getProperty("path.separator"), entries);
    }

    private void assertConnectionSettings(String url, String user, String password) throws IOException {
        assertTrue(Files.exists(directory.resolve("connection.bin")), "Expected a call to the synthetic driver");
        try (var input = new DataInputStream(Files.newInputStream(directory.resolve("connection.bin")))) {
            assertEquals(url, input.readUTF());
            assertEquals(user, input.readUTF());
            assertEquals(password, input.readUTF());
        }
    }

    private static void assertSafeOutput(String output, String... sensitiveValues) {
        for (String value : sensitiveValues) assertFalse(output.contains(value), "Output exposed a synthetic setting");
    }

    private record Result(int exitCode, String output) { }

    public static class RecordingDriver implements Driver {
        static {
            try {
                DriverManager.registerDriver(new RecordingDriver());
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        @Override
        public Connection connect(String url, Properties info) throws SQLException {
            if (!acceptsURL(url)) return null;
            try (var output = new java.io.DataOutputStream(Files.newOutputStream(Path.of(System.getProperty("synthetic.report"))))) {
                output.writeUTF(url);
                output.writeUTF(info.getProperty("user"));
                output.writeUTF(info.getProperty("password"));
            } catch (IOException exception) {
                throw new SQLException("Synthetic recording failed", exception);
            }
            throw new SQLException("Synthetic connection refused");
        }

        @Override public boolean acceptsURL(String url) { return url.startsWith("jdbc:synthetic:"); }
        @Override public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) { return new DriverPropertyInfo[0]; }
        @Override public int getMajorVersion() { return 1; }
        @Override public int getMinorVersion() { return 0; }
        @Override public boolean jdbcCompliant() { return false; }
        @Override public Logger getParentLogger() { return Logger.getGlobal(); }
    }

    public static class FailingDriver {
        static {
            if (System.getProperty("synthetic.report") != null) throw new IllegalStateException(FAILURE_MARKER);
        }
    }
}
