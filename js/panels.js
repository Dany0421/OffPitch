// Location panels: which building opens which module, and the overlay chrome
// around them. Extracted from world.js so it knows nothing about the 2D canvas.
//
// Two entries use it. index.html drives it from the 2D city, where walking into
// a door calls open(). panel.html drives it from Unreal, where the 3D city is
// the world and this page is only ever the panel on top of it.
//
// Anything that belongs to the 2D world -- remembering where to put the sprite
// on the way back, clearing the door prompt, retinting sprites -- is passed in
// as hooks by whoever is driving, and is simply absent in the 3D entry.
const Panels = (() => {
  // Hub tabs split by location, so a building shows its own slice of the Hub
  // rather than a duplicate of the whole thing.
  const HUB_VIEWS = {
    board: { title: 'Boardroom', tabs: ['tracker', 'rulebook', 'archive'] },
  };

  const MAPPING = {
    casa:          { custom: () => WorldCasa.render(document.getElementById('world-generic')) },
    balneario:     { custom: () => WorldBalneario.render(document.getElementById('world-generic')) },
    'club-office': { custom: () => WorldOffice.render(document.getElementById('world-generic')) },
    boardroom:     { panels: [['ruleset', 'Ruleset', () => RulesetModule.render()],
                              ['hub', 'Boardroom', () => HubModule.render(HUB_VIEWS.board)]] },
    quadro:        { custom: () => WorldBoard.render(document.getElementById('world-generic')) },
    estadio:       { custom: () => WorldStadium.render(document.getElementById('world-generic')) },
    sponsors:      { custom: () => WorldSponsors.render(document.getElementById('world-generic')) },
    imprensa:      { custom: () => WorldImprensa.render(document.getElementById('world-generic')) },
    agencia:       { custom: () => WorldAgencia.render(document.getElementById('world-generic')) },
  };

  // Location home (chooser / custom front page) — lets sub-panels go back to
  // the location menu instead of forcing a round-trip through the city.
  let _locHome = null;
  let _hooks = { onOpen: null, onClose: null };

  function init(hooks) {
    _hooks = Object.assign({ onOpen: null, onClose: null }, hooks || {});
    document.getElementById('world-back-btn').addEventListener('click', close);
    document.getElementById('world-setup-btn').addEventListener('click', openSetup);
    document.getElementById('world-menu-btn').addEventListener('click', () => {
      if (_locHome) _locHome.show();
    });
  }

  function navHook() {
    _menuBtn(!!_locHome);
  }

  function _menuBtn(show) {
    const btn = document.getElementById('world-menu-btn');
    if (show && _locHome) {
      btn.textContent = `← ${_locHome.label}`;
      btn.classList.remove('world-hidden');
    } else {
      btn.classList.add('world-hidden');
    }
  }

  function _clearPanels() {
    document.querySelectorAll('#world-overlay .module-panel')
      .forEach(p => p.classList.remove('active'));
  }

  function _showPanel(name, renderFn) {
    _clearPanels();
    const panel = document.getElementById(`module-${name}`);
    panel.classList.add('active');
    renderFn();
    if (window.lucide) lucide.createIcons();
    document.getElementById('world-overlay').scrollTop = 0;
    _menuBtn(!!_locHome);
  }

  function _showConstruction(label) {
    const panel = document.getElementById('world-generic');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'world-construction';
    const h = document.createElement('h2');
    h.textContent = label;
    const p = document.createElement('p');
    p.textContent = 'Em construção — chega numa fase seguinte.';
    wrap.append(h, p);
    panel.appendChild(wrap);
    _clearPanels();
    panel.classList.add('active');
  }

  function _showChooser(label, panels) {
    const panel = document.getElementById('world-generic');
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'world-chooser';
    for (const [name, title, renderFn] of panels) {
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.textContent = title;
      btn.addEventListener('click', () => _showPanel(name, renderFn));
      wrap.appendChild(btn);
    }
    panel.appendChild(wrap);
    _clearPanels();
    panel.classList.add('active');
  }

  // Restyle: each building dresses the overlay in its own theme class.
  function _setTheme(id) {
    const ov = document.getElementById('world-overlay');
    for (const c of [...ov.classList]) if (c.startsWith('theme-')) ov.classList.remove(c);
    const cls = (typeof WorldTheme !== 'undefined') && WorldTheme.THEMES[id];
    if (cls) ov.classList.add(cls);
  }

  function _openOverlayChrome() {
    document.getElementById('world-overlay').classList.add('open');
    document.getElementById('world-back-btn').classList.remove('world-hidden');
    document.getElementById('world-actions').classList.add('world-hidden');
  }

  function _showCustom(m) {
    _clearPanels();
    m.custom();
    document.getElementById('world-generic').classList.add('active');
    if (window.lucide) lucide.createIcons();
    document.getElementById('world-overlay').scrollTop = 0;
    _menuBtn(false);
  }

  // Setup lives outside the city (pre-world flow) — dedicated button, no door.
  function openSetup() {
    _locHome = null;
    if (_hooks.onOpen) _hooks.onOpen(null, null);
    _openOverlayChrome();
    _setTheme(null);
    _showPanel('setup', () => SetupModule.render());
  }

  function open(id) {
    const b = WorldMap.buildings.find(x => x.id === id)
      || WorldMap.props.find(p => p.id === id);
    if (!b) {
      console.warn(`Panels.open: location desconhecida "${id}"`);
      return;
    }
    if (_hooks.onOpen) _hooks.onOpen(id, b);
    _openOverlayChrome();
    _setTheme(id);
    _locHome = null;
    const m = MAPPING[id];
    if (!m) _showConstruction(b.label);
    else if (m.custom) {
      _locHome = { label: b.label, show: () => _showCustom(m) };
      _showCustom(m);
    }
    else if (m.panels.length === 1) _showPanel(m.panels[0][0], m.panels[0][2]);
    else {
      _locHome = { label: b.label, show: () => _showChooser(b.label, m.panels) };
      _showChooser(b.label, m.panels);
    }
  }

  function close() {
    document.getElementById('world-overlay').classList.remove('open');
    _setTheme(null);
    document.getElementById('world-back-btn').classList.add('world-hidden');
    document.getElementById('world-actions').classList.remove('world-hidden');
    _locHome = null;
    _menuBtn(false);
    if (_hooks.onClose) _hooks.onClose();
  }

  return { init, open, openSetup, close, navHook, MAPPING, HUB_VIEWS };
})();
