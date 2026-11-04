/**
 * Smooth scrolling (Lenis) and entrance animations (GSAP), on the main site pages.
 *
 * The heading blurs in word by word and content fades up as it scrolls into view,
 * after React Bits' BlurText and AnimatedContent. The site has no React, so these
 * are small GSAP versions rather than the components themselves.
 *
 * Does nothing for visitors who ask for reduced motion. scripts/tailwind.input.css
 * hides the heading until this runs, and shows it anyway if this never loads.
 */
(function () {
    'use strict';

    if (!window.gsap || !window.Lenis || !window.SplitText) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(SplitText);

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

    function blurInHeading() {
        var heading = document.querySelector('main h1');
        if (!heading) return;
        var intro = heading.nextElementSibling && heading.nextElementSibling.tagName === 'P' ? heading.nextElementSibling : null;
        gsap.set(intro ? [heading, intro] : heading, { visibility: 'visible' });

        // On a slow load the stylesheet's fallback has already shown the heading.
        if (performance.now() > 1400) return;

        var split = SplitText.create(heading, { type: 'words' });
        gsap.from(split.words, {
            opacity: 0,
            y: 10,
            filter: 'blur(8px)',
            duration: 0.7,
            ease: 'power2.out',
            stagger: 0.07,
            onComplete: function () { split.revert(); }
        });
        if (intro) gsap.from(intro, { opacity: 0, y: 8, duration: 0.7, delay: 0.25, ease: 'power2.out' });
    }

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

    blurInHeading();
    fadeUpContent();
})();
