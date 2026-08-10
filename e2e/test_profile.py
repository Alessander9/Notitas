"""Tests E2E de perfil: actualizar nombre/email y cambiar contraseña."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from helpers import (
    api_register, api_me, login_ui, logout_ui, wait, wait_text, wait_clickable,
    click_text, clear_and_type, field_by_label, random_email,
)


@pytest.mark.usefixtures("clean_browser_state")
class TestProfile:

    def _open_profile_dialog(self, driver):
        toolbar = driver.find_element(By.CSS_SELECTOR, ".MuiToolbar-root")
        buttons = toolbar.find_elements(By.CSS_SELECTOR, "button")
        buttons[-1].click()  # avatar
        click_text(driver, "Editar perfil", tag="li")
        wait_text(driver, "Guardar cambios", tag="button", timeout=10)

    def _close_profile_dialog(self, driver):
        """Cierra el diálogo de perfil (botón 'Cerrar') y espera a que se
        desmonte: si queda abierto, su backdrop intercepta los clics de la
        navbar (p. ej. el avatar para el logout)."""
        click_text(driver, "Cerrar", tag="button")
        WebDriverWait(driver, 10).until_not(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class,'MuiDialog-container')]"))
        )

    def test_actualizar_nombre(self, driver):
        email = random_email("prof")
        api_register(email, name="Nombre Viejo")
        login_ui(driver, email)
        self._open_profile_dialog(driver)

        name_input = field_by_label(driver, "Nombre")
        clear_and_type(name_input, "Nombre Nuevo")
        click_text(driver, "Guardar cambios", tag="button")

        wait_text(driver, "Perfil actualizado correctamente", timeout=15)

        # Verificar que el nombre quedó actualizado vía API
        import requests
        r = requests.post("http://localhost:8080/api/auth/login",
                          json={"email": email, "password": "secret123"}, timeout=15)
        assert r.status_code == 200
        me = requests.get("http://localhost:8080/api/users/me",
                          headers={"Authorization": f"Bearer {r.json()['token']}"}, timeout=15)
        assert me.json()["name"] == "Nombre Nuevo"

    def test_cambiar_contrasena_y_reloguearse(self, driver):
        email = random_email("pw")
        api_register(email, password="secret123")
        login_ui(driver, email)
        self._open_profile_dialog(driver)

        # Pestaña Contraseña (si existe) o sección visible
        tab = driver.find_elements(By.XPATH, "//*[contains(@role,'tab')][contains(., 'Contraseña')]")
        if tab:
            tab[0].click()

        current = field_by_label(driver, "Contraseña actual")
        current.send_keys("secret123")
        new_pw = field_by_label(driver, "Nueva contraseña")
        new_pw.send_keys("nueva-clave-99")
        # El formulario tiene 3 campos: sin confirmar, el botón queda deshabilitado
        confirm_pw = field_by_label(driver, "Confirmar nueva contraseña")
        confirm_pw.send_keys("nueva-clave-99")

        # En la pestaña Contraseña el botón se llama "Cambiar contraseña" (el
        # de "Guardar cambios" solo existe en la pestaña Perfil, que está
        # desmontada). Se espera a que esté habilitado (los 3 campos llenos).
        save = wait_clickable(driver, By.XPATH, "//button[contains(., 'Cambiar contraseña')]", timeout=10)
        save.click()
        wait_text(driver, "Contraseña actualizada correctamente", timeout=15)

        # Cerrar diálogo y probar login con la nueva clave
        self._close_profile_dialog(driver)
        logout_ui(driver, "E2E User")
        login_ui(driver, email, password="nueva-clave-99")
        wait_text(driver, "Mis Proyectos", timeout=35)

    def test_actualizar_email_y_reloguearse_con_nuevo(self, driver):
        email = random_email("eml")
        api_register(email, name="Mailer")
        login_ui(driver, email)
        self._open_profile_dialog(driver)

        nuevo_email = random_email("eml2")
        # El label del campo en ProfileDialog es "Email" (no "Correo electrónico")
        email_input = field_by_label(driver, "Email")
        clear_and_type(email_input, nuevo_email)
        click_text(driver, "Guardar cambios", tag="button")

        wait_text(driver, "Perfil actualizado correctamente", timeout=15)

        # El login con el email nuevo funciona (el JWT se re-emite con el nuevo subject)
        self._close_profile_dialog(driver)
        logout_ui(driver, "Mailer")
        login_ui(driver, nuevo_email)
        wait_text(driver, "Mis Proyectos", timeout=35)
