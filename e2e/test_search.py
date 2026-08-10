"""Tests E2E de búsqueda global (navbar) y Command Palette (Ctrl+K)."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from helpers import (
    api_register, api_create_project, api_create_note,
    login_ui, wait, wait_text, random_email,
)


@pytest.mark.usefixtures("clean_browser_state")
class TestSearch:

    def test_busqueda_global_navbar(self, driver):
        email = random_email("search")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Busqueda")
        api_create_note(token, project["id"], "Receta de Lomo Saltado", "<p>ingredientes</p>")
        api_create_note(token, project["id"], "Guía de Spring Security", "<p>jwt</p>")
        login_ui(driver, email)

        search = wait(driver, By.CSS_SELECTOR, "input[aria-label='search']")
        search.send_keys("lomo")

        wait_text(driver, "Receta de Lomo Saltado", timeout=15)
        # La nota no coincidente no aparece
        result = driver.find_elements(By.XPATH, "//*[contains(., 'Guía de Spring Security')]")
        assert not any("Guía de Spring Security" in el.text for el in result if el.is_displayed())

    def test_command_palette_ctrl_k(self, driver):
        email = random_email("palette")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Palette")
        api_create_note(token, project["id"], "Palette Target Note", "<p>x</p>")
        login_ui(driver, email)

        # Ctrl+K abre la command palette
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.CONTROL, "k")
        palette_input = wait(driver, By.XPATH, "//input[@placeholder and contains(@aria-label,'search')]", timeout=10)

        palette_input.send_keys("Palette Target")
        wait_text(driver, "Palette Target Note", timeout=15)

        # Esc cierra la paleta
        palette_input.send_keys(Keys.ESCAPE)
        wait(driver, By.TAG_NAME, "body", timeout=5)
