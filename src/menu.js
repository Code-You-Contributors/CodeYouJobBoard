/**
 * Initializes the hamburger menu toggle functionality once the DOM is fully loaded.
 *
 * Adds a click event listener to the hamburger button that:
 * - Toggles the icon between "fa-bars" and "fa-x"
 * - Shows or hides the sidebar menu by toggling the "active" class
 * - Prevents or allows body scrolling by toggling the "no-scroll" class
 *
 * @event DOMContentLoaded
 */
document.addEventListener("DOMContentLoaded", () => {
  /**
   * The hamburger button element that triggers the menu toggle.
   * @type {HTMLElement}
   */
  const burgerBtn = document.querySelector(".hamburger");

  burgerBtn.addEventListener("click", () => {
    /**
     * The icon inside the hamburger button.
     * @type {HTMLElement}
     */
    const burgerIcon = document.querySelector(".hamburger i");

    /**
     * The sidebar menu element.
     * @type {HTMLElement}
     */
    const menu = document.querySelector("aside");

    /**
     * The body element used to control page scroll behavior.
     * @type {HTMLElement}
     */
    const body = document.querySelector("body");

    burgerIcon.classList.toggle("fa-bars");
    burgerIcon.classList.toggle("fa-x");
    menu.classList.toggle("active");
    body.classList.toggle("no-scroll");
  });
});


