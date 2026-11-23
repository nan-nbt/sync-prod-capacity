FROM repo.pouchen.com/docker-proxy-group/azul/zulu-openjdk-alpine:21.0.13.1-21.54-jre

WORKDIR /app
COPY image-input/app.jar /app/app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
