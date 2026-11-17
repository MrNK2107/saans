import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no <dialog> methods; the sign-in dialog needs showModal() and close() to open and close.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom has no IntersectionObserver or matchMedia; scroll reveals and motion preferences need them.
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(window, { IntersectionObserver: IO });
  Object.assign(globalThis, { IntersectionObserver: IO });
}
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
  // Some files run in the plain Node environment, which has no web storage.
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
