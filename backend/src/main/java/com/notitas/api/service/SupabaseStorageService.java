package com.notitas.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;

/**
 * Implementación de {@link FileStorageService} respaldada por Supabase Storage.
 *
 * Activa con el perfil prod (env {@code APP_STORAGE_PROVIDER=supabase}) porque en
 * los hosts gratuitos con disco efímero (Render/Koyeb free) los archivos locales
 * se pierden en cada reinicio/redeploy. Se usa la API REST de Supabase con la
 * service_role key (solo server-side), sin dependencias adicionales (java.net.http).
 *
 * Las rutas devueltas siguen siendo "/uploads/{uuid.ext}" (mismo contrato que
 * antes): {@code UploadsRedirectController} redirige /uploads/** a la URL pública
 * del bucket, así el frontend no necesita ningún cambio.
 */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "supabase")
public class SupabaseStorageService implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseStorageService.class);

    private final String storageUrl;    // https://<ref>.supabase.co/storage/v1
    private final String serviceRoleKey;
    private final String bucket;
    private final String publicBaseUrl; // https://<ref>.supabase.co/storage/v1/object/public/<bucket>

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public SupabaseStorageService(
            @Value("${app.supabase.url}") String supabaseUrl,
            @Value("${app.supabase.service-role-key}") String serviceRoleKey,
            @Value("${app.supabase.bucket:uploads}") String bucket) {
        this.storageUrl = supabaseUrl.replaceAll("/+$", "") + "/storage/v1";
        this.serviceRoleKey = serviceRoleKey;
        this.bucket = bucket;
        this.publicBaseUrl = this.storageUrl + "/object/public/" + bucket;
    }

    @Override
    public String storeFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFileName.contains("..")) {
            throw new RuntimeException("Filename contains invalid path sequence " + originalFileName);
        }

        String fileExtension = "";
        int lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex != -1) {
            fileExtension = originalFileName.substring(lastDotIndex);
        }

        String fileName = UUID.randomUUID() + fileExtension;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(storageUrl + "/object/" + bucket + "/" + fileName))
                    // Las claves nuevas (sb_secret_...) exigen apikey + Authorization;
                    // con la antigua service_role (JWT) ambas cabeceras también funcionan.
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", file.getContentType() != null
                            ? file.getContentType()
                            : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                logger.error("Supabase upload failed ({}): {}", response.statusCode(), response.body());
                throw new RuntimeException("Could not store file " + fileName + ". Please try again!");
            }
            return fileName;
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    @Override
    public void deleteFile(String fileName) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(storageUrl + "/object/" + bucket + "/" + fileName))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .DELETE()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 200) {
                return;
            }
            if (status >= 500) {
                logger.error("Supabase delete failed ({}): {}", status, response.body());
                throw new RuntimeException("Could not delete file " + fileName);
            }
            // 400/404 (no existía) y 401/403 (clave inválida) no rompen el flujo,
            // pero se registran para poder detectar configuraciones rotas.
            logger.warn("Supabase delete returned {} for {}: {}", status, fileName, response.body());
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Could not delete file " + fileName, ex);
        }
    }

    @Override
    public void deleteContentImages(String content) {
        if (content == null || content.isEmpty()) return;
        Matcher matcher = FileStorageService.UPLOAD_PATH_PATTERN.matcher(content);
        while (matcher.find()) {
            String path = matcher.group();
            String fileName = path.substring(path.lastIndexOf('/') + 1);
            deleteFile(fileName);
        }
    }

    /** URL pública base del bucket (usada por el redirect de /uploads/**). */
    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }
}
