"""Tests E2E de proyectos: crear, editar, borrar, filtros, vista grid/lista e invitación."""
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    FRONTEND, api_register, api_create_project, api_invite_token, api_join_project,
    api_user_projects, login_ui, wait, wait_text, wait_text_gone, click_text,
    clear_and_type, random_email, click_confirm_button, click_row_action, project_list_row,
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.mark.usefixtures("clean_browser_state")
class TestProjects:

    def test_crear_proyecto_via_dialog(self, driver):
        email = random_email("proj")
        api_register(email)
        login_ui(driver, email)
        nombre = f"Proyecto E2E {email[:6]}"

        click_text(driver, "Nuevo Proyecto", tag="button")
        name_input = wait(driver, By.XPATH, "//input[@placeholder='Ej. Plan de estudios 2026']")
        name_input.send_keys(nombre)
        click_text(driver, "Crear proyecto", tag="button")

        wait_text(driver, nombre, timeout=20)
        wait_text(driver, "Proyecto creado", timeout=10)  # toast

    def test_editar_proyecto(self, driver):
        email = random_email("edit")
        token = api_register(email)
        api_create_project(token, "Proyecto a Renombrar")
        login_ui(driver, email)
        wait_text(driver, "Proyecto a Renombrar", timeout=15)

        # Abrir edición desde la fila de lista (hover sobre la fila real)
        click_row_action(driver, "Proyecto a Renombrar", "EditIcon")

        name_input = wait(driver, By.XPATH, "//input[@placeholder='Ej. Plan de estudios 2026']")
        clear_and_type(name_input, "Proyecto Renombrado")
        click_text(driver, "Guardar cambios", tag="button")

        wait_text(driver, "Proyecto Renombrado", timeout=20)

    def test_borrar_proyecto_con_confirmacion(self, driver):
        email = random_email("del")
        token = api_register(email)
        api_create_project(token, "Proyecto Desechable")
        login_ui(driver, email)
        wait_text(driver, "Proyecto Desechable", timeout=15)

        click_row_action(driver, "Proyecto Desechable", "DeleteIcon")

        # ConfirmDialog (mismatch de props: ConfirmDialog usa confirmLabel, el
        # dashboard pasa confirmText → muestra "Confirmar")
        click_confirm_button(driver)
        wait_text(driver, "Proyecto eliminado", timeout=15)
        wait_text_gone(driver, "Proyecto Desechable", timeout=15)

    def test_filtro_dashboard(self, driver):
        email = random_email("filter")
        token = api_register(email)
        api_create_project(token, "Proyecto Alfa")
        api_create_project(token, "Proyecto Beta")
        login_ui(driver, email)
        wait_text(driver, "Proyecto Alfa", timeout=15)

        filter_input = wait(driver, By.XPATH, "//input[@placeholder='Filtrar proyectos...']")
        filter_input.send_keys("Beta")

        # La fila del DASHBOARD (dentro de un MuiCard) que coincide se filtra.
        # OJO: el sidebar muestra el nombre del proyecto fuera de un Card, así
        # que wait_text_gone global no sirve — hay que mirar solo la lista del
        # dashboard.
        WebDriverWait(driver, 10).until_not(
            EC.presence_of_element_located((By.XPATH,
                "//*[contains(@class,'MuiCard-root')]//*[contains(@class,'MuiListItemButton-root')][contains(., 'Proyecto Alfa')]"))
        )
        # Y la fila de Beta sigue ahí
        assert project_list_row(driver, "Proyecto Beta", timeout=5) is not None

    def test_cambio_vista_grid_lista(self, driver):
        email = random_email("grid")
        token = api_register(email)
        api_create_project(token, "Proyecto Vista")
        login_ui(driver, email)
        wait_text(driver, "Proyecto Vista", timeout=15)

        # Cambiar a vista cuadrícula (ToggleButton aria-label="grid view")
        grid_btn = wait(driver, By.XPATH, "//button[@aria-label='grid view']")
        grid_btn.click()
        # La card de la vista grid aparece (mismo nombre)
        wait(driver, By.XPATH, "//*[contains(@class,'MuiCard-root')][contains(., 'Proyecto Vista')]", timeout=15)

        # Volver a lista
        list_btn = wait(driver, By.XPATH, "//button[@aria-label='list view']")
        list_btn.click()
        wait(driver, By.XPATH, "//*[contains(@class,'MuiListItemButton-root')][contains(., 'Proyecto Vista')]", timeout=15)

    def test_invitacion_y_union(self, driver):
        """Owner genera enlace; invitado se une (rol EDITOR) vía API check."""
        owner_email = random_email("own")
        owner_token = api_register(owner_email)
        project = api_create_project(owner_token, "Proyecto Compartido E2E")
        invite = api_invite_token(owner_token, project["id"])

        guest_email = random_email("guest")
        guest_token = api_register(guest_email)
        api_join_project(guest_token, invite)

        # El invitado ve el proyecto en su lista (API)
        names = [p["name"] for p in api_user_projects(guest_token)]
        assert "Proyecto Compartido E2E" in names

        # Y en la UI tras loguearse
        login_ui(driver, guest_email)
        wait_text(driver, "Proyecto Compartido E2E", timeout=20)
