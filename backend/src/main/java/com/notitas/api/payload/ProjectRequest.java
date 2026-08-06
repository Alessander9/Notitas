package com.notitas.api.payload;

import jakarta.validation.constraints.NotBlank;

public class ProjectRequest {
    @NotBlank
    private String name;
    private String icon;
    private String color;
    private String description;
    private String coverImage;

    public ProjectRequest() {}

    public ProjectRequest(String name, String icon, String color, String description, String coverImage) {
        this.name = name;
        this.icon = icon;
        this.color = color;
        this.description = description;
        this.coverImage = coverImage;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
}
