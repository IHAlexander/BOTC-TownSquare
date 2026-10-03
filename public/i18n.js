// Client-side i18n helper. The message catalog lives on the server
// (lib/i18n.js) and arrives with every STATE broadcast, so this file only
// stores the active messages and applies them to the DOM.
(function () {
  'use strict';

  let messages = {};

  function interpolate(text, params) {
    if (!params) return text;
    for (const name of Object.keys(params)) {
      text = text.split(`{${name}}`).join(String(params[name]));
    }
    return text;
  }

  function t(key, params) {
    const text = messages[key];
    return text === undefined ? key : interpolate(text, params);
  }

  // Translates static markup: data-i18n (text), data-i18n-placeholder,
  // data-i18n-title.
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  window.I18N = {
    setMessages(next) { messages = next || {}; },
    t,
    applyStatic,
  };
})();
