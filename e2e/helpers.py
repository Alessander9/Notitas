"""Helpers compartidos para la suite E2E de Notitas (Selenium + pytest).

- Helpers de API: crean usuarios/proyectos/notas rápidamente (sin pasar por
  la UI) para aislar cada test y acelerar la suite.
- Helpers de UI: esperas explícitas y acciones comunes sobre la interfaz.
"""
import random
import string

import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

API = "http://localhost:8080/api"
FRONTEND = "http://localhost:5174"


# ---------------------------------------------------------------- utilidades
def random_email(prefix="e2e"):
    return f"{prefix}.{''.join(random.choices(string.ascii_lowercase, k=8))}@test.com"


# ---------------------------------------------------------------- API helpers
def api_register(email=None, password="secret123", name="E2E User"):
    email = email or random_email()
    r = requests.post(f"{API}/auth/register",
                      json={"name": name, "email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"register failed {r.status_code}: {r.text}"
    return api_login(email, password)


def api_login(email, password="secret123"):
    r = requests.post(f"{API}/auth/login",
                      json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json()["token"]


def api_me(token):
    r = requests.get(f"{API}/users/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def api_create_project(token, name, **extra):
    r = requests.post(f"{API}/projects",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"name": name, **extra}, timeout=15)
    assert r.status_code == 200, f"create project failed {r.status_code}: {r.text}"
    return r.json()


def api_create_note(token, project_id, title="Nota e2e", content="<p>Contenido e2e</p>"):
    r = requests.post(f"{API}/projects/{project_id}/notes",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"title": title, "content": content}, timeout=15)
    assert r.status_code == 200, f"create note failed {r.status_code}: {r.text}"
    return r.json()


def api_update_note(token, note_id, **fields):
    r = requests.put(f"{API}/notes/{note_id}",
                     headers={"Authorization": f"Bearer {token}"},
                     json=fields, timeout=15)
    assert r.status_code == 200, f"update note failed {r.status_code}: {r.text}"
    return r.json()


def api_invite_token(token, project_id):
    r = requests.post(f"{API}/projects/{project_id}/invite-token",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["inviteToken"]


def api_join_project(token, invite_token):
    r = requests.post(f"{API}/projects/join/{invite_token}",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, f"join failed {r.status_code}: {r.text}"
    return r.json()


def api_share_token(token, note_id):
    r = requests.post(f"{API}/notes/{note_id}/share-token",
                      headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["shareToken"]


def api_user_projects(token):
    r = requests.get(f"{API}/projects", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------- UI helpers
def wait(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, value)))


def wait_visible(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((by, value)))


def wait_clickable(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, value)))


def wait_text(driver, text, timeout=15, tag="*"):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, f"//{tag}[contains(normalize-space(.), '{text}')]"))
    )


def wait_text_gone(driver, text, timeout=15):
    WebDriverWait(driver, timeout).until_not(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(normalize-space(.), '{text}')]"))
    )


def click_text(driver, text, tag="*", timeout=15):
    el = wait_clickable(driver, By.XPATH, f"//{tag}[contains(normalize-space(.), '{text}')]", timeout)
    el.click()
    return el


def clear_and_type(el, text):
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(text)


def field_by_label(driver, label_text):
    """Busca el input asociado a una label MUI (por htmlFor)."""
    label = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//label[contains(normalize-space(.), '{label_text}')]"))
    )
    for_attr = label.get_attribute("for")
    if for_attr:
        return driver.find_element(By.ID, for_attr)
    return label.find_element(By.XPATH, "./ancestor::div[contains(@class,'MuiFormControl')]//input")


def login_ui(driver, email, password="secret123", timeout=35):
    driver.get(f"{FRONTEND}/login")
    wait(driver, By.ID, "email", timeout).send_keys(email)
    driver.find_element(By.ID, "password").send_keys(password)
    click_submit_retry(driver)
    # Dashboard con "Mis Proyectos" (detrás de la WelcomeScreen)
    wait_text(driver, "Mis Proyectos", timeout=timeout)
    # La WelcomeScreen (position:fixed, z-index 10000) cubre la app ~3.4 s y
    # bloquea los clics: esperar a que se desmonte antes de continuar
    WebDriverWait(driver, 15).until_not(
        EC.presence_of_element_located((By.XPATH, "//div[contains(@style, 'z-index: 10000')]"))
    )
    # asegurar que las queries de proyectos ya resolvieron
    wait_text(driver, "Nuevo Proyecto", tag="button", timeout=timeout)


def logout_ui(driver, user_name):
    """Cierra sesión desde el menú del avatar (último botón de la toolbar)."""
    toolbar = driver.find_element(By.CSS_SELECTOR, ".MuiToolbar-root")
    buttons = toolbar.find_elements(By.CSS_SELECTOR, "button")
    buttons[-1].click()
    click_text(driver, "Cerrar sesión", tag="li")
    # WelcomeScreen de despedida + vuelta al login
    wait(driver, By.ID, "email", timeout=30)


def project_list_row(driver, name, timeout=15):
    """La fila ListItemButton del DASHBOARD (vista lista) que contiene el nombre.
    OJO: el sidebar también muestra el nombre del proyecto, pero con estructura
    distinta; la fila del dashboard es la que cuelga de un MuiCard."""
    return wait(driver, By.XPATH,
                f"//*[contains(@class,'MuiCard-root')]//*[contains(@class,'MuiListItemButton-root')][contains(., '{name}')]",
                timeout)


def click_row_action(driver, project_name, icon_testid):
    """Hover sobre la fila real del proyecto en el dashboard y clic en su icono de
    acción. El hover CSS (opacity 0 → 1) solo se activa moviendo el cursor sobre
    la FILA, no sobre un ancestro. Si el clic normal es interceptado (hover no
    aplicado en headless), se fuerza con click() de JS que ignora pointer-events."""
    import time
    from selenium.common.exceptions import (
        ElementClickInterceptedException, ElementNotInteractableException,
        StaleElementReferenceException, WebDriverException,
    )
    row = project_list_row(driver, project_name)
    ActionChains(driver).move_to_element(row).perform()
    time.sleep(0.4)
    icon = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH,
            f"//*[contains(@class,'project-list-actions')]//*[@data-testid='{icon_testid}']")))
    try:
        icon.click()
    except (ElementClickInterceptedException, ElementNotInteractableException,
            StaleElementReferenceException, WebDriverException):
        # Fallback: click sintáctico que no comprueba clickabilidad ni hover
        driver.execute_script("arguments[0].click()", icon)


def open_project_ui(driver, name, timeout=30):
    """Abre un proyecto desde el dashboard (fila de lista)."""
    row = project_list_row(driver, name, timeout)
    ActionChains(driver).move_to_element(row).perform()
    row.click()
    # La vista de proyecto muestra el encabezado "NOTAS (n)" y el botón Añadir
    wait(driver, By.XPATH, "//button[contains(., 'Añadir')]", timeout=timeout)


def add_note_ui(driver):
    click_text(driver, "Añadir", tag="button")
    wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=25)


def edit_note_ui(driver, title, content):
    title_input = wait(driver, By.XPATH, "//*[@placeholder='Título de la nota']", timeout=25)
    clear_and_type(title_input, title)
    editor = wait(driver, By.CSS_SELECTOR, ".ProseMirror", timeout=15)
    editor.click()
    editor.send_keys(content)
    # El autoguardado (debounce 800 ms) muestra el estado "Guardado"
    wait_text(driver, "Guardado", timeout=20)


def find_note_card(driver, title):
    return wait(driver, By.XPATH,
                f"//*[contains(@class,'MuiCard-root')][contains(., '{title}')]")


def hover_and_click_icon(driver, card, icon_testid):
    """Hover sobre la card y clic en el icono de acción (visibles al hover).
    La card puede re-renderizarse durante el hover (React reemplaza el nodo):
    se re-busca el icono a nivel de driver cada iteración y, si el clic normal
    falla, se usa click() de JS como respaldo."""
    import time
    from selenium.common.exceptions import (
        ElementClickInterceptedException, ElementNotInteractableException,
        StaleElementReferenceException, WebDriverException,
    )
    ActionChains(driver).move_to_element(card).perform()
    icon = WebDriverWait(driver, 10).until(
        lambda d: d.find_element(By.XPATH,
            f"//*[contains(@class,'note-card-actions')]//*[@data-testid='{icon_testid}']"))
    try:
        icon.click()
    except (ElementClickInterceptedException, ElementNotInteractableException,
            StaleElementReferenceException, WebDriverException):
        driver.execute_script("arguments[0].click()", icon)


def click_confirm_button(driver, labels=("Eliminar", "Confirmar", "Borrar", "Sí, eliminar"), timeout=10):
    """Hace clic en el botón de confirmación de un ConfirmDialog.
    El diálogo se monta con animación (framer-motion delay ~0.35 s) y React
    puede re-renderizar sus botones: se reintenta hasta que aparece un botón
    visible y, si el clic es interceptado (backdrop/animación), se usa click()
    de JS como respaldo."""
    import time
    from selenium.common.exceptions import (
        ElementClickInterceptedException, StaleElementReferenceException,
    )
    deadline = time.time() + timeout
    while time.time() < deadline:
        for label in labels:
            els = driver.find_elements(By.XPATH, f"//button[contains(normalize-space(.), '{label}')]")
            visible = [e for e in els if e.is_displayed()]
            if visible:
                try:
                    visible[-1].click()
                    return label
                except (ElementClickInterceptedException, StaleElementReferenceException):
                    try:
                        driver.execute_script("arguments[0].click()", visible[-1])
                        return label
                    except Exception:
                        pass
        time.sleep(0.4)
    raise AssertionError(f"No se encontró botón de confirmación {labels}")


def click_card_icon(driver, title, icon_testid, timeout=10):
    """Clic en un icono SIEMPRE visible de la card de una nota (favorito,
    restaurar/borrar definitivo de la papelera). Re-localiza la card por
    título cada iteración (React puede re-renderizar y reemplazar nodos)."""
    import time
    from selenium.common.exceptions import (
        ElementClickInterceptedException, StaleElementReferenceException,
        NoSuchElementException,
    )
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            fresh = driver.find_element(By.XPATH,
                f"//*[contains(@class,'MuiCard-root')][contains(., '{title}')]")
            icon = fresh.find_element(By.XPATH, f".//*[@data-testid='{icon_testid}']")
            if not icon.is_displayed():
                time.sleep(0.3)
                continue
            try:
                icon.click()
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click()", icon)
            return
        except (StaleElementReferenceException, NoSuchElementException):
            time.sleep(0.3)
    raise AssertionError(f"icono {icon_testid} no disponible en la card '{title}'")


def click_js(driver, element):
    """Clic sintáctico (ignora pointer-events / intercepts de backdrop)."""
    driver.execute_script("arguments[0].click()", element)


def click_retry(driver, by, xpath, timeout=10):
    """Clic con reintentos: React puede reemplazar el nodo entre la búsqueda y
    el clic (stale element → execute_script recibe un nodo fantasma y lanza
    'arguments[0].click is not a function'), o un backdrop puede interceptar el
    clic. Re-busca el elemento en cada intento y, si el clic normal falla, usa
    click() de JS como respaldo."""
    import time
    from selenium.common.exceptions import (
        JavascriptException, StaleElementReferenceException,
        ElementClickInterceptedException, NoSuchElementException,
    )
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            el = driver.find_element(by, xpath)
            try:
                el.click()
            except (StaleElementReferenceException, ElementClickInterceptedException, JavascriptException):
                driver.execute_script("arguments[0].click()", el)
            return el
        except (StaleElementReferenceException, NoSuchElementException, JavascriptException):
            time.sleep(0.3)
    raise AssertionError(f"No se pudo hacer clic en {xpath}")


def click_submit_retry(driver, attempts=5):
    """Clic en el botón submit con reintentos. React 19 en modo dev puede
    reemplazar el nodo del botón entre el find y el click (stale element) o
    deshabilitarlo durante el submit (intercepted): se reintenta en ambos casos."""
    import time
    from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException
    btn_selector = "button[type='submit']"
    for i in range(attempts):
        try:
            btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, btn_selector)))
            btn.click()
            return
        except (ElementClickInterceptedException, StaleElementReferenceException):
            time.sleep(0.8)
    raise AssertionError(f"No se pudo pulsar el botón submit tras {attempts} intentos")
