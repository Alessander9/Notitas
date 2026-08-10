package com.notitas.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests unitarios de {@link FileStorageServiceImpl} sobre un directorio
 * temporal real: almacenamiento con UUID, saneado de nombres, borrado y
 * limpieza de imágenes inline desde el HTML del contenido.
 */
class FileStorageServiceImplTest {

    @TempDir
    Path tempDir;

    private FileStorageServiceImpl storage;

    @BeforeEach
    void setUp() {
        storage = new FileStorageServiceImpl(tempDir.toString());
    }

    @Test
    void storeFile_generatesUuidNameKeepingExtension_andPersistsBytes() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", new byte[]{1, 2, 3});

        String stored = storage.storeFile(file);

        assertThat(stored).isNotBlank();
        assertThat(stored).endsWith(".png");
        assertThat(stored.length()).isEqualTo(36 + 4); // UUID + ".png"
        assertThat(tempDir.resolve(stored)).exists();
        assertThat(Files.readAllBytes(tempDir.resolve(stored))).containsExactly(1, 2, 3);
    }

    @Test
    void storeFile_withoutExtension_keepsNoExtension() {
        MockMultipartFile file = new MockMultipartFile("file", "archivo", "text/plain", "hola".getBytes());

        String stored = storage.storeFile(file);

        assertThat(stored).doesNotContain(".");
        assertThat(stored).isNotBlank();
    }

    @Test
    void storeFile_rejectsPathTraversalSequences() {
        MockMultipartFile file = new MockMultipartFile("file", "../evil.png", "image/png", new byte[]{1});

        assertThatThrownBy(() -> storage.storeFile(file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("invalid path sequence");
    }

    @Test
    void deleteFile_removesExistingFile_andIsNoOpForMissing() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "tmp.txt", "text/plain", "x".getBytes());
        String stored = storage.storeFile(file);
        assertThat(tempDir.resolve(stored)).exists();

        storage.deleteFile(stored);

        assertThat(tempDir.resolve(stored)).doesNotExist();
        // Borrar un archivo inexistente no lanza excepción
        storage.deleteFile("no-existe.txt");
    }

    @Test
    void deleteContentImages_removesEveryReferencedUpload() throws IOException {
        Path img1 = tempDir.resolve("a1b2c3.png");
        Path img2 = tempDir.resolve("d4e5f6.jpg");
        Path unrelated = tempDir.resolve("keepme.png");
        Files.write(img1, new byte[]{1});
        Files.write(img2, new byte[]{2});
        Files.write(unrelated, new byte[]{3});

        String content = "<p>Hola</p>"
                + "<img src=\"/uploads/a1b2c3.png\" alt=\"x\">"
                + "<img src=\"/uploads/d4e5f6.jpg\">";

        storage.deleteContentImages(content);

        assertThat(img1).doesNotExist();
        assertThat(img2).doesNotExist();
        // Un archivo que NO está referenciado en el HTML se conserva
        assertThat(unrelated).exists();
    }

    @Test
    void deleteContentImages_nullOrEmptyContent_isSafe() {
        storage.deleteContentImages(null);
        storage.deleteContentImages("");
    }
}
