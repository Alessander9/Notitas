"""Fixtures de pytest para la suite E2E.

- Un único navegador Chrome headless (session-scoped).
- Antes de cada test se limpian cookies + localStorage para aislar sesiones.
"""
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from helpers import FRONTEND


@pytest.fixture(scope="function")
def driver():
    """Un navegador por test: aísla por completo el estado (localStorage,
    sesión, animaciones) y elimina la interferencia entre tests."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    options.add_argument("--lang=es")
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(45)
    yield driver
    driver.quit()


@pytest.fixture(autouse=True)
def clean_browser_state(driver):
    """Borra cookies y localStorage antes de cada test (aislamiento)."""
    # Navegar primero a una URL http real: en about:blank/data: URLs el
    # localStorage no está disponible y execute_script lanza WebDriverException.
    driver.get(f"{FRONTEND}/login")
    driver.delete_all_cookies()
    driver.execute_script("localStorage.clear()")
    yield


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Guarda un screenshot si un test E2E falla (ayuda a depurar selectores)."""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        driver = item.funcargs.get("driver")
        if driver is not None:
            try:
                import os
                name = item.name[:60].replace("[", "_").replace("]", "_")
                path = os.path.join(os.path.dirname(__file__), "screenshots", f"{name}.png")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                driver.save_screenshot(path)
            except Exception:
                pass
