package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvalidInvocationTest {
    @TempDir
    Path workingDirectory;

    @Test
    void invalidDaysArgumentsExitBeforeConfigurationOrDatabaseStartup() throws Exception {
        List<String[]> invalidArguments = List.of(
                new String[]{},
                new String[]{"--days=1", "--days=2"},
                new String[]{"--days=0"},
                new String[]{"--days=-1"},
                new String[]{"--days=+1"},
                new String[]{"--days=1.5"},
                new String[]{"--days=abc"},
                new String[]{"--days=9223372036854775808"},
                new String[]{"--days=999999999"}
        );

        for (String[] arguments : invalidArguments) {
            ProcessResult result = invokeApplication(arguments);
            String invocation = String.join(" ", arguments);
            assertNotEquals(0, result.exitCode(), "Expected nonzero exit for: " + invocation);
            assertTrue(result.output().contains("Invalid invocation:"),
                    "Expected a safe invalid-invocation diagnostic for: " + invocation + "\n" + result.output());
            assertFalse(result.output().contains("Application startup failed"),
                    "Invalid input must be rejected before configuration startup: " + invocation);
            assertFalse(result.output().contains("Transfer failed"),
                    "Invalid input must be rejected before transfer startup: " + invocation);
        }
    }

    private ProcessResult invokeApplication(String[] arguments) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        command.add("-cp");
        command.add(System.getProperty("java.class.path"));
        command.add(CapacityApplication.class.getName());
        command.addAll(List.of(arguments));

        Process process = new ProcessBuilder(command)
                .directory(workingDirectory.toFile())
                .redirectErrorStream(true)
                .start();
        boolean exited = process.waitFor(30, TimeUnit.SECONDS);
        if (!exited) {
            process.destroyForcibly();
            throw new AssertionError("Application process did not exit within 30 seconds.");
        }
        return new ProcessResult(process.exitValue(), new String(process.getInputStream().readAllBytes()));
    }

    private record ProcessResult(int exitCode, String output) {
    }
}
