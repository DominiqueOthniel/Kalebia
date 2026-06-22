(function(){
  'use strict';

  var burger = document.getElementById('burger');
  var links = document.getElementById('navlinks');
  if (!burger || !links) return;

  var mobileNav = window.matchMedia('(max-width:920px)');

  function syncNavA11y(){
    if (mobileNav.matches && !links.classList.contains('open')) {
      links.setAttribute('aria-hidden', 'true');
    } else {
      links.removeAttribute('aria-hidden');
    }
  }

  function openNav(){
    links.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    links.removeAttribute('aria-hidden');
    var first = links.querySelector('a');
    if (first) first.focus();
  }

  function closeNav(){
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    syncNavA11y();
    burger.focus();
  }

  syncNavA11y();
  mobileNav.addEventListener('change', syncNavA11y);

  burger.addEventListener('click', function(){
    if (links.classList.contains('open')) closeNav();
    else openNav();
  });

  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && links.classList.contains('open')) closeNav();
  });
})();
