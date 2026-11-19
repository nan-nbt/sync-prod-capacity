package com.example.capacity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.nio.file.Path;
import java.time.Clock;

@SpringBootApplication
public class CapacityApplication {
    public static void main(String[] args) {
        System.exit(run(args));
    }

    static int run(String[] args) {
        final DaysWindow window;
        try {
            window = DaysWindow.parse(args, Clock.systemDefaultZone());
        } catch (IllegalArgumentException exception) {
            System.err.println("Invalid invocation: " + exception.getMessage());
            return 2;
        }

        final EnvFileConfiguration.Settings settings;
        try {
            settings = EnvFileConfiguration.read(Path.of(".env"));
        } catch (Exception exception) {
            System.err.println("Application startup failed; verify the required database settings in the root .env file.");
            return 1;
        }
        SpringApplication application = new SpringApplicationBuilder(CapacityApplication.class)
                .web(WebApplicationType.NONE)
                .properties(settings.datasourceProperties().entrySet().stream()
                        .map(entry -> entry.getKey() + "=" + entry.getValue()).toArray(String[]::new))
                .build();
        ConfigurableApplicationContext context;
        try {
            context = application.run(args);
        } catch (Exception exception) {
            System.err.println("Application startup failed; verify external database configuration.");
            return 1;
        }
        try {
            context.getBean(CapacityTransfer.class).transfer(window);
        } catch (org.springframework.transaction.TransactionSystemException exception) {
            closeContext(context);
            System.err.println("Transfer outcome unknown; inspect target state before retry.");
            return 1;
        } catch (Exception exception) {
            closeContext(context);
            System.err.println("Transfer failed; inspect target state before retry if commit status is uncertain.");
            return 1;
        }
        try {
            context.close();
            return 0;
        } catch (Exception exception) {
            System.err.println("Transfer committed, but application shutdown failed.");
            return 1;
        }
    }

    private static void closeContext(ConfigurableApplicationContext context) {
        try {
            context.close();
        } catch (Exception ignored) {
            // Preserve the transfer failure classification; never print connection details.
        }
    }
}
