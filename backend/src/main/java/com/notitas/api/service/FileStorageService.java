package com.notitas.api.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.regex.Pattern;

public interface FileStorageService {

    /** Coincide rutas "/uploads/..." dentro del HTML del contenido (src, href, url()). */
    Pattern UPLOAD_PATH_PATTERN = Pattern.compile("/uploads/[^\"'()\\s<>]+");

    String storeFile(MultipartFile file);
    void deleteFile(String fileName);

    /**
     * Borra todos los archivos referenciados como "/uploads/..." dentro del
     * HTML del contenido de una nota (imágenes inline insertadas en el editor).
     */
    void deleteContentImages(String content);
}
