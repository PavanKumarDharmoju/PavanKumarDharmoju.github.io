/**
 * Smooth scrolling (Lenis) and a fade-up as content scrolls into view (GSAP), on
 * the main site pages. The fade-up follows React Bits' AnimatedContent; the site
 * has no React, so it's a small GSAP version rather than the component itself.
 *
 * Does nothing for visitors who ask for reduced motion.
 */
(function () {
    'use strict';

    if (!window.gsap || !window.Lenis) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var REVEAL = 'main .space-y-4 > p, main .space-y-6 > *, main .space-y-3 > a, main .pgrid > figure, main .grid > a, main .border.rounded-lg';

    var lenis = new Lenis({
        autoRaf: false,
        anchors: true,
        prevent: function (node) { return node.closest('dialog, textarea'); }
    });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // The page behind an open dialog (the photo viewer) stays put.
    document.querySelectorAll('dialog').forEach(function (dialog) {
        new MutationObserver(function () {
            if (dialog.open) lenis.stop();
            else lenis.start();
        }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    });

    function fadeUpContent() {
        var observer = new IntersectionObserver(function (entries) {
            var seen = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
            if (!seen.length) return;
            seen.forEach(function (el) { observer.unobserve(el); });
            gsap.to(seen, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.06, clearProps: 'opacity,transform' });
        }, { rootMargin: '0px 0px -6% 0px' });

        var targets = Array.prototype.slice.call(document.querySelectorAll(REVEAL));
        targets.forEach(function (el) {
            // Nested matches move with their parent, and anything on screen now stays as painted.
            var nested = targets.some(function (other) { return other !== el && other.contains(el); });
            if (nested || el.getBoundingClientRect().top < innerHeight) return;
            gsap.set(el, { opacity: 0, y: 20 });
            observer.observe(el);
        });
    }

    fadeUpContent();
})();
