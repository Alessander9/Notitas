"""Tests E2E de notas: editor, autoguardado, favoritos, papelera, versiones, compartir."""
import pytest
from selenium.webdriver.common.by import By

from helpers import (
    FRONTEND, api_register, api_create_project, api_create_note, api_update_note,
    api_share_token, login_ui, wait, wait_text, wait_text_gone, click_text,
    clear_and_type, open_project_ui, add_note_ui, edit_note_ui, find_note_card,
    hover_and_click_icon, click_card_icon, click_js, click_retry, random_email, click_confirm_button,
)


@pytest.mark.usefixtures("clean_browser_state")
class TestNotes:

    def _setup_project_with_note(self, email, title="Nota E2E"):
        token = api_register(email)
        project = api_create_project(token, "Proyecto Notas E2E")
        note = api_create_note(token, project["id"], title, "<p>Contenido original</p>")
        return token, project, note

    def test_crear_y_editar_nota_con_autoguardado(self, driver):
        email = random_email("note")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Edición")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Edición")

        add_note_ui(driver)
        edit_note_ui(driver, "Mi Nota Autoguardada", "Contenido escrito en el editor")

        # La nota queda listada con el nuevo título
        wait_text(driver, "Mi Nota Autoguardada", timeout=15)

    def test_favorito_desde_lista_y_vista_favoritos(self, driver):
        email = random_email("fav")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Favs")
        api_create_note(token, project["id"], "Nota Favorita E2E", "<p>x</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Favs")

        # El StarBorderIcon es un botón SIEMPRE visible del header de la card
        # (no requiere hover, no está en .note-card-actions)
        click_card_icon(driver, "Nota Favorita E2E", "StarBorderIcon")

        # En Favoritos (sidebar) aparece
        click_text(driver, "Favoritos", tag="li")
        wait_text(driver, "Nota Favorita E2E", timeout=15)

    def test_papelera_restaurar_y_borrado_definitivo(self, driver):
        email = random_email("trash")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Papelera")
        note = api_create_note(token, project["id"], "Nota Descartable", "<p>x</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Papelera")

        # Borrado blando desde la vista de proyecto (DeleteIcon en note-card-actions)
        card = find_note_card(driver, "Nota Descartable")
        hover_and_click_icon(driver, card, "DeleteIcon")
        wait_text(driver, "Nota movida a la papelera", timeout=10)
        wait_text_gone(driver, "Nota Descartable", timeout=15)

        # Papelera → restaurar (TrashView: botones SIEMPRE visibles, sin hover).
        # OJO: TrashView importa `RestoreFromTrash as RestoreIcon`; MUI genera el
        # data-testid a partir del nombre REAL del icono (RestoreFromTrashIcon).
        click_text(driver, "Papelera", tag="li")
        wait_text(driver, "Nota Descartable", timeout=15)
        click_card_icon(driver, "Nota Descartable", "RestoreFromTrashIcon")
        wait_text_gone(driver, "Nota Descartable", timeout=15)

        # Tras restaurar seguimos en la vista Papelera: volver al dashboard
        # para abrir el proyecto de nuevo (open_project_ui opera desde ahí)
        click_text(driver, "Panel de Proyectos", tag="li")
        wait_text(driver, "Mis Proyectos", timeout=15)
        open_project_ui(driver, "Proyecto Papelera")
        card2 = find_note_card(driver, "Nota Descartable")
        hover_and_click_icon(driver, card2, "DeleteIcon")
        click_text(driver, "Papelera", tag="li")
        wait_text(driver, "Nota Descartable", timeout=15)
        # Borrado definitivo: DeleteForeverIcon (importado como PermDeleteIcon)
        # + ConfirmDialog
        click_card_icon(driver, "Nota Descartable", "DeleteForeverIcon")
        click_confirm_button(driver, ("Eliminar", "Confirmar"))
        wait_text_gone(driver, "Nota Descartable", timeout=15)

    def test_historial_de_versiones_y_restauracion(self, driver):
        email = random_email("ver")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Versionado")
        note = api_create_note(token, project["id"], "Versión 1", "<p>v1</p>")
        api_update_note(token, note["id"], title="Versión 2", content="<p>v2</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Versionado")

        card = find_note_card(driver, "Versión 2")
        card.click()
        wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=25)

        # Abrir historial (IconButton con tooltip "Historial de versiones")
        # Localizamos por el icono HistoryIcon/ManageHistory si existe; si no,
        # por el tooltip tras hover. Usamos el SVG data-testid si está presente.
        history_icons = driver.find_elements(
            By.XPATH, "//*[@data-testid='HistoryIcon' or @data-testid='ManageHistoryIcon']")
        if not history_icons:
            # Fallback: botones del header del editor (último bloque antes del contenido)
            buttons = driver.find_elements(By.CSS_SELECTOR, "[aria-label]")
            raise AssertionError(
                "No se encontró el botón de historial de versiones "
                f"(aria-labels: {[b.get_attribute('aria-label') for b in buttons]})"
            )
        history_icons[0].click()

        wait_text(driver, "Historial de versiones", timeout=10)
        # Restaurar la versión más antigua (botón 'Restaurar esta versión')
        restore_buttons = wait(driver, By.XPATH, "//button[contains(., 'Restaurar esta versión')]")
        click_js(driver, restore_buttons)
        click_confirm_button(driver, ("Restaurar", "Confirmar"))

        # Tras restaurar, el editor muestra el título de la versión antigua
        wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=20)
        title_value = driver.find_element(By.XPATH, "//*[@placeholder='Título de la nota']").get_attribute("value")
        assert title_value in ("Versión 1", "Versión 2"), f"título inesperado: {title_value}"

    def test_compartir_nota_publica_desde_editor(self, driver):
        email = random_email("share")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Compartir")
        note = api_create_note(token, project["id"], "Nota Pública E2E", "<p>contenido público</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Compartir")

        card = find_note_card(driver, "Nota Pública E2E")
        card.click()
        wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=25)

        # El icono Share se repite (sidebar, cards, editor): usamos el último.
        # click_retry re-busca el nodo por si React lo reemplaza entre find y click.
        click_retry(driver, By.XPATH, "(//*[@data-testid='ShareIcon'])[last()]")

        # La nota se crea SIN token: el diálogo muestra "Compartido Desactivado"
        # con un botón para activar. Pulsarlo genera el shareToken.
        wait_text(driver, "Compartido Desactivado", timeout=10)
        click_retry(driver, By.XPATH, "//button[contains(., 'Activar Compartido')]")

        # Diálogo de compartir: contiene un enlace /shared/note/{token}
        link_input = wait(driver, By.XPATH, "//input[contains(@value, '/shared/note/')]", timeout=15)
        share_url = link_input.get_attribute("value")
        assert "/shared/note/" in share_url

        # Abrir el enlace público sin sesión
        driver.delete_all_cookies()
        driver.execute_script("localStorage.clear()")
        driver.get(share_url)
        wait_text(driver, "Nota Pública E2E", timeout=20)
        wait_text(driver, "contenido público", timeout=10)

    def test_tags_desde_editor(self, driver):
        email = random_email("tags")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Tags")
        note = api_create_note(token, project["id"], "Nota Con Tags", "<p>x</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Tags")

        card = find_note_card(driver, "Nota Con Tags")
        card.click()
        wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=25)

        tag_input = wait(driver, By.XPATH, "//input[@placeholder='+ Etiqueta']", timeout=10)
        tag_input.send_keys("importante")
        tag_input.send_keys("\ue007")  # Enter
        wait_text(driver, "importante", timeout=10)

    def test_deshacer_borrado_con_toast(self, driver):
        email = random_email("undo")
        token = api_register(email)
        project = api_create_project(token, "Proyecto Undo")
        api_create_note(token, project["id"], "Nota Recuperable", "<p>x</p>")
        login_ui(driver, email)
        open_project_ui(driver, "Proyecto Undo")

        card = find_note_card(driver, "Nota Recuperable")
        hover_and_click_icon(driver, card, "DeleteIcon")
        wait_text(driver, "Nota movida a la papelera", timeout=10)

        # Toast con acción "Deshacer"
        click_text(driver, "Deshacer", tag="button", timeout=10)
        wait_text(driver, "Nota Recuperable", timeout=15)
