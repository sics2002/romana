export class FocusManager {
  constructor(root = document) {
    this.root = root;
    this.lastId = '';
    this.listener = event => {
      const element = event.target.closest?.('[data-focus]');
      if (element) this.lastId = element.dataset.focus;
    };
    root.addEventListener('focusin', this.listener);
  }

  available(element) {
    return !element.disabled && !element.closest('[hidden],[inert]') &&
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  }

  scope(root) {
    const dialogs = [...root.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(element => this.available(element));
    return dialogs[dialogs.length - 1] || root;
  }

  elements(scope = this.root) {
    return [...this.scope(scope).querySelectorAll('[data-focus]')].filter(element => this.available(element));
  }

  focus(id, scope = this.root) {
    scope = this.scope(scope);
    const direct=id&&scope.querySelector('[data-focus="'+String(id).replace(/[^a-zA-Z0-9_-]/g,'')+'"]');
    const element=direct&&this.available(direct)?direct:this.elements(scope)[0];
    if (element) {
      element.focus({ preventScroll: true });
      // A visible action is not enough: returning to the hero must reveal its
      // entire artwork, instead of leaving its upper half above the viewport.
      const hero=element.closest('.hero');
      (hero||element).scrollIntoView({ behavior:'smooth', block:hero?'start':'nearest', inline:'nearest' });
      this.lastId = element.dataset.focus;
    }
    return element;
  }

  move(key, scope = this.root) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return false;
    scope = this.scope(scope);
    const list = this.elements(scope);
    const current = document.activeElement;
    if (!list.includes(current)) { this.focus('', scope); return true; }
    if (document.documentElement.dataset.mode === 'cinemana') {
      const sidebar = current.closest('#navigation');
      if(sidebar && ['ArrowUp','ArrowDown'].includes(key)) {
        const peers=this.elements(sidebar),index=peers.indexOf(current)+(key==='ArrowDown'?1:-1);
        if(peers[index])this.focus(peers[index].dataset.focus,scope);return true;
      }
      if(sidebar && key==='ArrowRight')return true;
    }
    if(key==='ArrowUp'&&document.documentElement.dataset.page==='home'){
      const row=current.closest('.content-row');
      if(row&&row===document.querySelector('#content .content-row')&&document.querySelector('.hero')){this.focus('hero-detail',scope);return true}
    }
    if(typeof window!=='undefined'&&window.cinemanaLegacy&&!current.closest('.tv-player')&&['ArrowUp','ArrowDown'].includes(key)){
      const section=current.closest('.content-row');
      if(section){const sections=[...document.querySelectorAll('#content .content-row')];const index=sections.indexOf(section),next=sections[index+(key==='ArrowDown'?1:-1)];
       if(next){const peers=[...section.querySelectorAll('.poster-card')],targets=[...next.querySelectorAll('.poster-card')];const target=targets[Math.min(Math.max(0,peers.indexOf(current)),targets.length-1)];if(target){this.focus(target.dataset.focus,scope);return true}}
       else if(key==='ArrowUp'){this.focus('hero-detail',scope);return true}
       else{const more=document.querySelector('[data-focus="home-more-sections"]');if(more&&!more.hidden){this.focus(more.dataset.focus,scope);return true}}
      }
    }
    const rect = current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
    const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
    const group = current.closest('[data-focus-group]');

    // A shelf is one continuous horizontal row. Grids use the actual geometry.
    if (horizontal && group) {
      const style = getComputedStyle(group);
      if (style.display === 'flex' && style.flexDirection === 'row' && style.flexWrap === 'nowrap') {
        const peers = this.elements(group);
        const delta = style.direction === 'rtl' ? -direction : direction;
        const next = peers[peers.indexOf(current) + delta];
        if (next) { this.focus(next.dataset.focus, scope); return true; }
        if(document.documentElement.dataset.mode==='cinemana'&&key==='ArrowRight'&&!current.closest('.tv-player')){
          const nav=document.querySelector('#navigation .active')||document.querySelector('#navigation [data-focus]');if(nav)this.focus(nav.dataset.focus,scope);return true;
        }
        return true;
      }
    }

    let best;
    let bestScore = Infinity;
    for (const element of list) {
      if (element === current) continue;
      const candidate = element.getBoundingClientRect();
      const x = candidate.left + candidate.width / 2;
      const y = candidate.top + candidate.height / 2;
      const primary = (horizontal ? x - cx : y - cy) * direction;
      if (primary <= 4) continue;
      const secondary = Math.abs(horizontal ? y - cy : x - cx);
      const overlap = horizontal
        ? Math.min(rect.bottom, candidate.bottom) - Math.max(rect.top, candidate.top)
        : Math.min(rect.right, candidate.right) - Math.max(rect.left, candidate.left);
      const score = primary + secondary * 0.55 + (overlap <= 0 ? 800 : 0);
      if (score < bestScore) { bestScore = score; best = element; }
    }
    if (best) this.focus(best.dataset.focus, scope);
    return true;
  }
}
