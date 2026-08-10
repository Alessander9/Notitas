"""Tests E2E de autenticación: registro, login (con/sin recordarme), logout."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from helpers import (
    FRONTEND, api_register, api_login, login_ui, logout_ui, click_submit_retry,
    wait, wait_text, wait_text_gone, random_email,
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.usefixtures("clean_browser_state")
class TestAuth:

    def test_registro_ui_completo(self, driver):
        """Registro por UI → alerta de éxito → redirección al login → login."""
        email = random_email("reg")
        driver.get(f"{FRONTEND}/register")

        wait(driver, By.ID, "name").send_keys("Registro E2E")
        driver.find_element(By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys("secret123")
        driver.find_element(By.ID, "confirmPassword").send_keys("secret123")
        click_submit_retry(driver)

        wait_text(driver, "Registro exitoso", timeout=10)
        # Redirige al login tras 2 s. OJO: el campo id='email' existe también en
        # la página de registro (aún montada durante el retraso), así que la
        # señal fiable de la redirección es la URL, no el input.
        WebDriverWait(driver, 15).until(lambda d: "/login" in d.current_url)
        wait(driver, By.ID, "email", timeout=15)

        # Login con el usuario recién creado (el nodo puede re-renderizarse tras
        # la redirección: clic con reintentos)
        driver.find_element(By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys("secret123")
        click_submit_retry(driver)
        wait_text(driver, "Mis Proyectos", timeout=35)
        # Esperar a que la WelcomeScreen deje de bloquear
        WebDriverWait(driver, 15).until_not(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@style, 'z-index: 10000')]"))
        )

    def test_login_password_incorrecto_muestra_error(self, driver):
        email = random_email("bad")
        api_register(email)
        driver.get(f"{FRONTEND}/login")

        wait(driver, By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys("wrong-pass")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # El Alert de error aparece (mensaje de la API en español)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[@role='alert']"))
        )
        assert "Credenciales" in driver.find_element(By.XPATH, "//*[@role='alert']").text

    def test_login_remember_me_checked_persiste_cookie(self, driver):
        """Con 'Recuérdame' la cookie jwt dura 30 días (tiene expiry)."""
        email = random_email("rm")
        api_register(email)
        driver.get(f"{FRONTEND}/login")

        # Checkbox marcado por defecto (el input MUI está oculto: se lee su estado)
        checkbox = wait(driver, By.CSS_SELECTOR, "input[type='checkbox']")
        assert checkbox.is_selected(), "El checkbox 'Recuérdame' debería venir marcado"

        wait(driver, By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys("secret123")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        wait_text(driver, "Mis Proyectos", timeout=35)

        jwt_cookie = next((c for c in driver.get_cookies() if c["name"] == "jwt"), None)
        assert jwt_cookie is not None, "cookie jwt no emitida"
        assert jwt_cookie.get("expiry"), "cookie 'recordarme' debería tener fecha de expiración (~30 días)"

    def test_login_sin_remember_me_cookie_de_sesion(self, driver):
        """Sin 'Recuérdame' la cookie jwt es de sesión (sin expiry)."""
        email = random_email("sess")
        api_register(email)
        driver.get(f"{FRONTEND}/login")

        wait(driver, By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys("secret123")
        # Desmarcar recordarme (clic en la label; el input de MUI está oculto)
        driver.find_element(By.XPATH, "//label[contains(., 'Recuérdame')]").click()
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        wait_text(driver, "Mis Proyectos", timeout=35)

        jwt_cookie = next((c for c in driver.get_cookies() if c["name"] == "jwt"), None)
        assert jwt_cookie is not None
        assert jwt_cookie.get("expiry") is None, "cookie de sesión no debe expirar (maxAge -1)"

    def test_logout_cierra_sesion_y_protege_rutas(self, driver):
        email = random_email("logout")
        api_register(email)
        login_ui(driver, email)

        logout_ui(driver, "E2E User")
        # La ruta raíz ya no muestra el workspace
        driver.get(f"{FRONTEND}/")
        wait(driver, By.ID, "email", timeout=15)

    def test_demo_user_seeded_tiene_datos(self, driver):
        """El seeder demo (perfil test) crea admin@notitas.com con 2 proyectos."""
        login_ui(driver, "admin@notitas.com", "password123")
        wait_text(driver, "Backend Spring Boot", timeout=20)
        wait_text(driver, "Frontend React", timeout=10)
