package com.notitas.api;

import com.notitas.api.model.*;
import com.notitas.api.repository.NoteRepository;
import com.notitas.api.repository.NoteVersionRepository;
import com.notitas.api.repository.ProjectRepository;
import com.notitas.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Datos demo SOLO fuera de producción (dev y tests): con el perfil
 * "prod" activo no se siembra el usuario/proyectos de ejemplo.
 */
@Component
@Profile("!prod")
public class DatabaseInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NoteVersionRepository noteVersionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Only initialize if database is empty
        if (userRepository.count() == 0) {
            System.out.println("Initializing database with demo data...");

            // 1. Create Demo User
            User user = User.builder()
                    .name("Developer User")
                    .email("admin@notitas.com")
                    .password(passwordEncoder.encode("password123"))
                    .avatar("https://api.dicebear.com/7.x/adventurer/svg?seed=Developer")
                    .build();
            userRepository.save(user);

            // 2. Create Project: Spring Boot Backend
            Project project1 = Project.builder()
                    .user(user)
                    .name("Backend Spring Boot")
                    .icon("folder")
                    .color("#1976d2")
                    .description("API REST, security, and integration tests.")
                    .build();
            projectRepository.save(project1);

            // Notes for Project 1
            Note note1 = Note.builder()
                    .project(project1)
                    .title("Implementación de JWT")
                    .content("<h1>JWT en Spring Boot 3.5</h1><p>Para configurar JWT en Spring Boot, necesitamos las siguientes dependencias:</p><pre><code>&lt;dependency&gt;\n  &lt;groupId&gt;io.jsonwebtoken&lt;/groupId&gt;\n  &lt;artifactId&gt;jjwt-api&lt;/artifactId&gt;\n  &lt;version&gt;0.12.6&lt;/version&gt;\n&lt;/dependency&gt;</code></pre><p>Luego creamos un filtro que intercepte cada request y extraiga el header Authorization.</p>")
                    .favorite(true)
                    .build();
            note1.getTags().add(Tag.builder().note(note1).tag("Spring").build());
            note1.getTags().add(Tag.builder().note(note1).tag("Security").build());
            note1.getTags().add(Tag.builder().note(note1).tag("JWT").build());
            noteRepository.save(note1);
            seedInitialVersion(note1, user);

            Note note2 = Note.builder()
                    .project(project1)
                    .title("Dockerización del Backend")
                    .content("<h1>Dockerfile para Spring Boot</h1><p>Una estructura de Dockerfile recomendada es:</p><pre><code>FROM eclipse-temurin:17-jdk-alpine\nVOLUME /tmp\nCOPY target/*.jar app.jar\nENTRYPOINT [\"java\",\"-jar\",\"/app.jar\"]</code></pre>")
                    .favorite(false)
                    .build();
            note2.getTags().add(Tag.builder().note(note2).tag("Docker").build());
            note2.getTags().add(Tag.builder().note(note2).tag("DevOps").build());
            noteRepository.save(note2);
            seedInitialVersion(note2, user);

            // 3. Create Project: React Frontend
            Project project2 = Project.builder()
                    .user(user)
                    .name("Frontend React")
                    .icon("folder")
                    .color("#2e7d32")
                    .description("Single Page Application UI components.")
                    .build();
            projectRepository.save(project2);

            // Notes for Project 2
            Note note3 = Note.builder()
                    .project(project2)
                    .title("Configuración de Zustand")
                    .content("<h1>Manejo de Estado con Zustand</h1><p>Zustand es una alternativa ligera y limpia a Redux. Nos permite definir un hook global:</p><pre><code>import { create } from 'zustand';\n\nexport const useUiStore = create((set) =&gt; ({\n  darkMode: true,\n  toggleDarkMode: () =&gt; set((state) =&gt; ({ darkMode: !state.darkMode })),\n}));</code></pre>")
                    .favorite(true)
                    .build();
            note3.getTags().add(Tag.builder().note(note3).tag("React").build());
            note3.getTags().add(Tag.builder().note(note3).tag("Zustand").build());
            noteRepository.save(note3);
            seedInitialVersion(note3, user);

            System.out.println("Demo data initialized successfully!");
        }
    }

    /** Siembra la versión inicial de una nota demo para que el historial no esté vacío. */
    private void seedInitialVersion(Note note, User user) {
        noteVersionRepository.save(NoteVersion.builder()
                .note(note)
                .title(note.getTitle())
                .content(note.getContent())
                .updatedBy(user.getId())
                .build());
    }
}
