"""Tests E2E de colaboración/compartición: nota pública, join y invitación pendiente."""
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    FRONTEND, api_register, api_create_project, api_create_note, api_share_token,
    api_invite_token, api_user_projects, login_ui, wait, wait_text, click_text, random_email,
)


@pytest.mark.usefixtures("clean_browser_state")
class TestSharing:

    def test_nota_compartida_publica(self, driver):
        """El enlace público /shared/note/{token} muestra la nota sin sesión."""
        email = random_email("pub")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Público")
        note = api_create_note(token, project["id"], "Nota Secreta Pública", "<p>solo lectura pública</p>")
        share = api_share_token(token, note["id"])

        driver.get(f"{FRONTEND}/shared/note/{share}")
        wait_text(driver, "Nota Secreta Pública", timeout=20)
        wait_text(driver, "solo lectura pública", timeout=10)

    def test_join_proyecto_con_sesion(self, driver):
        owner_email = random_email("own2")
        owner_token = api_register(owner_email)
        project = api_create_project(owner_token, "Proyecto Invitación Con Sesión")
        invite = api_invite_token(owner_token, project["id"])

        guest_email = random_email("guest2")
        api_register(guest_email)
        login_ui(driver, guest_email)

        # Visitar el enlace de invitación ya con sesión → se une automáticamente
        driver.get(f"{FRONTEND}/join/project/{invite}")
        wait_text(driver, "Te has unido con éxito", timeout=25)

        # Verificar por API con un token del invitado
        import requests
        r = requests.post("http://localhost:8080/api/auth/login",
                          json={"email": guest_email, "password": "secret123"}, timeout=15)
        assert r.status_code == 200
        names = [p["name"] for p in api_user_projects(r.json()["token"])]
        assert "Proyecto Invitación Con Sesión" in names

    def test_invitacion_pendiente_tras_login(self, driver):
        owner_email = random_email("own3")
        owner_token = api_register(owner_email)
        project = api_create_project(owner_token, "Proyecto Invitación Pendiente")
        invite = api_invite_token(owner_token, project["id"])

        guest_email = random_email("guest3")
        api_register(guest_email)

        # Sin sesión: la página de invitación ofrece iniciar sesión
        driver.get(f"{FRONTEND}/join/project/{invite}")
        wait_text(driver, "Invitación a Proyecto", timeout=15)
        click_text(driver, "Iniciar Sesión para Unirse", tag="button")

        # Login → redirige de vuelta y une automáticamente
        wait(driver, By.ID, "email", timeout=15)
        driver.find_element(By.ID, "email").send_keys(guest_email)
        driver.find_element(By.ID, "password").send_keys("secret123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        wait_text(driver, "Te has unido con éxito", timeout=40)
        # Tras unirse se redirige DENTRO del proyecto (no al dashboard): la vista
        # de proyecto muestra el botón "Añadir" de notas
        wait(driver, By.XPATH, "//button[contains(., 'Añadir')]", timeout=30)

        import requests
        r = requests.post("http://localhost:8080/api/auth/login",
                          json={"email": guest_email, "password": "secret123"}, timeout=15)
        guest_token = r.json()["token"]
        names = [p["name"] for p in api_user_projects(guest_token)]
        assert "Proyecto Invitación Pendiente" in names

    def test_token_invite_invalido_muestra_error(self, driver):
        email = random_email("badinv")
        api_register(email)
        login_ui(driver, email)

        driver.get(f"{FRONTEND}/join/project/token-inexistente-xyz")
        wait_text(driver, "Token de invitación inválido", timeout=25)
