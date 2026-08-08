# ============================================================
# Notitas API — imagen de producción (Spring Boot 17)
# Sirve para desplegar el backend en Vercel (Docker), Railway,
# Render, Fly.io o cualquier host con contenedores.
#
# Variables de entorno requeridas en runtime:
#   SPRING_PROFILES_ACTIVE=prod
#   DB_URL, DB_USER, DB_PASSWORD   (Supabase/PostgreSQL)
#   CORS_ALLOWED_ORIGINS          (https://notitas-cleo.vercel.app)
#   NOTITAS_JWT_SECRET            (secreto JWT propio)
# ============================================================
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# mvnw puede perder el bit de ejecución al clonar desde Windows
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY src/ src/
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S notitas && adduser -S -G notitas notitas
COPY --from=build /app/target/*.jar app.jar
USER notitas
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-XX:+UseSerialGC", "-Xss512k", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
