"""Tests E2E de UI general: tema, notificaciones y navegación del sidebar."""
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    api_register, api_create_project, api_invite_token, api_join_project,
    login_ui, wait, wait_text, wait_text_gone, click_text, random_email,
)


@pytest.mark.usefixtures("clean_browser_state")
class TestUi:

    def test_toggle_tema_oscuro_claro(self, driver):
        email = random_email("theme")
        api_register(email)
        login_ui(driver, email)

        # darkMode=true por defecto → se muestra el icono de "ir a claro" (Brightness7)
        wait(driver, By.XPATH, "//*[@data-testid='Brightness7Icon']", timeout=10)
        driver.find_element(By.XPATH, "//*[@data-testid='Brightness7Icon']").click()
        # Ahora se muestra el de "ir a oscuro" (Brightness4)
        wait(driver, By.XPATH, "//*[@data-testid='Brightness4Icon']", timeout=10)
        # Volver a oscuro
        driver.find_element(By.XPATH, "//*[@data-testid='Brightness4Icon']").click()
        wait(driver, By.XPATH, "//*[@data-testid='Brightness7Icon']", timeout=10)

    def test_navegacion_sidebar_dashboard_favoritos_papelera(self, driver):
        email = random_email("nav")
        api_register(email)
        login_ui(driver, email)
        wait_text(driver, "Mis Proyectos", timeout=15)

        click_text(driver, "Favoritos", tag="li")
        wait_text(driver, "Favoritos", timeout=15)

        click_text(driver, "Papelera", tag="li")
        wait_text(driver, "Papelera", timeout=15)

        # El nav del sidebar llama a esta vista "Panel de Proyectos"
        click_text(driver, "Panel de Proyectos", tag="li")
        wait_text(driver, "Mis Proyectos", timeout=15)

    def test_campana_notificaciones_con_badge_y_lectura(self, driver):
        owner_email = random_email("notif")
        owner_token = api_register(owner_email)
        project = api_create_project(owner_token, "Proyecto Notificaciones")
        invite = api_invite_token(owner_token, project["id"])

        guest_email = random_email("notifg")
        guest_token = api_register(guest_email)
        api_join_project(guest_token, invite)

        login_ui(driver, owner_email)
        # El badge se refresca al recargar (el contador se consulta al montar)
        driver.refresh()
        wait_text(driver, "Mis Proyectos", timeout=20)

        badge = wait(driver, By.XPATH, "//*[contains(@class,'MuiBadge-badge')][normalize-space(.)='1']", timeout=20)
        assert badge.text == "1"

        # Abrir la campana → notificación "Nuevo colaborador" (timeouts amplios:
        # tras una suite larga el backend puede tardar en resolver el listado)
        bell = wait(driver, By.XPATH, "//*[@data-testid='NotificationsIcon']")
        bell.click()
        wait_text(driver, "Nuevo colaborador", timeout=25)

        # Marcar todas como leídas (icono DoneAll) → el badge se oculta.
        # OJO: MUI Badge con showZero=false conserva el TEXTO anterior ('1') en el
        # span cuando el contador llega a 0, pero le aplica la clase
        # MuiBadge-invisible (transform: scale(0)): es la señal fiable de que el
        # contador se reseteó (buscar por texto '0' o esperar que desaparezca el
        # '1' nunca funcionaría).
        driver.find_element(By.XPATH, "//*[@data-testid='DoneAllIcon']").click()
        wait_text(driver, "marcadas como leídas", timeout=10)
        from selenium.webdriver.support.ui import WebDriverWait
        WebDriverWait(driver, 20).until(
            lambda d: any(
                "MuiBadge-invisible" in (b.get_attribute("class") or "")
                for b in d.find_elements(By.XPATH, "//*[contains(@class,'MuiBadge-badge')]")
            )
        )

    def test_limpiar_historial_notificaciones(self, driver):
        owner_email = random_email("notif2")
        owner_token = api_register(owner_email)
        project = api_create_project(owner_token, "Proyecto Notificaciones 2")
        invite = api_invite_token(owner_token, project["id"])
        guest_email = random_email("notifg2")
        guest_token = api_register(guest_email)
        api_join_project(guest_token, invite)

        login_ui(driver, owner_email)
        driver.refresh()
        wait(driver, By.XPATH, "//*[@data-testid='NotificationsIcon']", timeout=20)
        driver.find_element(By.XPATH, "//*[@data-testid='NotificationsIcon']").click()

        wait_text(driver, "Nuevo colaborador", timeout=25)
        # "Limpiar historial" vacía la bandeja
        click_text(driver, "Limpiar historial", tag="button")
        wait_text(driver, "No tienes notificaciones", timeout=25)
