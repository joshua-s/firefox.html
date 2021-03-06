/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * navbar.js
 *
 * Code handling the navigation bar. The navigation bar includes
 * the back/forward/stop/reload buttons, the url bar and the search
 * bar.
 *
 */

require(["js/urlhelper", "js/tabiframedeck", "js/keybindings"],
function(UrlHelper, TabIframeDeck, RegisterKeyBindings) {

  "use strict";

  let link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/navbar.css";
  let defaultStyleSheet = document.querySelector("link[title=default]");
  document.head.insertBefore(link, defaultStyleSheet.nextSibling);

  let html = `
    <hbox class="navbar toolbar" align="center">
      <button class="back-button"></button>
      <button class="forward-button"></button>
      <button class="reload-button"></button>
      <button class="stop-button"></button>
      <hbox class="urlbar" flex="1" align="center">
        <div class="identity"></div>
        <input placeholder="Search or enter address" class="urlinput" flex="1">
      </hbox>
      <hbox class="searchbar" flex="1" align="center">
        <div class="searchselector"></div>
        <input placeholder="Yahoo" class="searchinput">
      </hbox>
      <button class="menu-button"></button>
    </hbox>
  `;
  let outervbox = document.querySelector("#outervbox");
  let outerhbox = document.querySelector("#outerhbox");
  let placeholder = document.createElement("hbox");
  outervbox.insertBefore(placeholder, outerhbox);
  placeholder.outerHTML = html;

  let navbar = document.querySelector(".navbar");

  let urlTemplate = "https://search.yahoo.com/search?p={searchTerms}";

  let urlbar = navbar.querySelector(".urlbar");
  let urlinput = navbar.querySelector(".urlinput");
  let searchbar = navbar.querySelector(".searchbar");
  let searchinput = navbar.querySelector(".searchinput");
  let backButton = navbar.querySelector(".back-button")
  let forwardButton = navbar.querySelector(".forward-button")
  let reloadButton = navbar.querySelector(".reload-button");
  let stopButton = navbar.querySelector(".stop-button");

  backButton.onclick = () => TabIframeDeck.getSelected().goBack();
  forwardButton.onclick = () => TabIframeDeck.getSelected().goForward();
  reloadButton.onclick = () => TabIframeDeck.getSelected().reload();
  stopButton.onclick = () => TabIframeDeck.getSelected().stop();

  urlinput.addEventListener("focus", () => {
    urlinput.select();
    urlbar.classList.add("focus");
  })

  urlinput.addEventListener("blur", () => {
    urlbar.classList.remove("focus");
  })

  urlinput.addEventListener("keypress", (e) => {
    if (e.keyCode == 13) {
      UrlInputChanged()
    }
  });

  urlinput.addEventListener("input", () => {
    TabIframeDeck.getSelected().userInput = urlinput.value;
  });

  searchinput.addEventListener("focus", () => {
    searchinput.select();
    searchbar.classList.add("focus");
  })
  searchinput.addEventListener("blur", () => searchbar.classList.remove("focus"))
  searchinput.addEventListener("keypress", (e) => {
    if (e.keyCode == 13) {
      SearchInputChanged()
    }
  });

  let mod = window.OS == "osx" ? "Cmd" : "Ctrl";

  RegisterKeyBindings(
    [mod,    "l",   () => {
      urlinput.focus();
      urlinput.select();
    }],
    [mod,    "k",   () => {
      searchinput.focus();
      searchinput.select();
    }]
  );

  function UrlInputChanged() {
    let text = urlinput.value;
    let url = PreprocessUrlInput(text);
    let tabIframe = TabIframeDeck.getSelected();
    tabIframe.setLocation(url);
    tabIframe.focus();
  }

  function SearchInputChanged() {
    let text = searchinput.value;
    let url = urlTemplate.replace('{searchTerms}', encodeURIComponent(text));
    let tabIframe = TabIframeDeck.getSelected();
    tabIframe.setLocation(url);
    tabIframe.focus();
  }

  TabIframeDeck.on("select", OnTabSelected);

  let lastSelectedTab = null;

  function OnTabSelected() {
    let selectedTabIframe = TabIframeDeck.getSelected();
    if (lastSelectedTab) {
      lastSelectedTab.off("dataUpdate", UpdateTab);
    }
    lastSelectedTab = selectedTabIframe;
    if (selectedTabIframe) {
      if (!selectedTabIframe.location) {
        urlinput.focus();
        urlinput.select();
      }

      selectedTabIframe.on("dataUpdate", UpdateTab);
      UpdateTab();
    }
  }

  OnTabSelected();

  function UpdateTab() {
    let tabIframe = TabIframeDeck.getSelected();

    if (tabIframe.loading) {
      navbar.classList.add("loading");
    } else {
      navbar.classList.remove("loading");
    }

    if (tabIframe.userInput) {
      urlinput.value = tabIframe.userInput;
    } else {
      urlinput.value = tabIframe.location
    }

    if (!window.IS_PRIVILEGED) {
      return;
    }

    if (tabIframe.securityState == "secure") {
      navbar.classList.add("ssl");
      if (tabIframe.securityExtendedValidation) {
        navbar.classList.add("sslev");
      }
    } else {
      navbar.classList.remove("ssl");
      navbar.classList.remove("sslev");
    }

    tabIframe.canGoBack().then(canGoBack => {
      // Make sure iframe is still selected
      if (tabIframe != TabIframeDeck.getSelected()) {
        return;
      }
      if (canGoBack) {
        backButton.classList.remove("disabled");
      } else {
        backButton.classList.add("disabled");
      }
    });

    tabIframe.canGoForward().then(canGoForward => {
      // Make sure iframe is still selected
      if (tabIframe != TabIframeDeck.getSelected()) {
        return;
      }
      if (canGoForward) {
        forwardButton.classList.remove("disabled");
      } else {
        forwardButton.classList.add("disabled");
      }
    });
  };

  function PreprocessUrlInput(input) {
    if (UrlHelper.isNotURL(input)) {
      return urlTemplate.replace('{searchTerms}', encodeURIComponent(input));
    }

    if (!UrlHelper.hasScheme(input)) {
      input = 'http://' + input;
    }

    return input;
  };

});
