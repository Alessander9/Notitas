import '@testing-library/jest-dom';

// jsdom no implementa matchMedia (lo usan MUI y framer-motion en responsive)
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  });
}

// MUI v6 y framer-motion pueden requerir ResizeObserver en jsdom
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// scrollTo no existe en jsdom
if (!window.scrollTo) {
  window.scrollTo = () => {};
}
