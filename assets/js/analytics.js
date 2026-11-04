/**
 * PostHog analytics for pixelsbypavan.com
 *
 * Records page views, page leaves and clicks (PostHog "autocapture") on every
 * page that includes this file. The Bansuri and Singing Companion tools also
 * send a few named events (tab views, drills finished, scores) through
 * window.posthog.capture.
 *
 * Setup: paste the Project API key from PostHog (Settings -> Project -> Project
 * API key, it starts with "phc_") into POSTHOG_KEY. EU Cloud projects also need
 * POSTHOG_HOST set to https://eu.i.posthog.com.
 *
 * Nothing is sent from localhost, file:// previews or any other domain.
 *
 * Test traffic still reaches PostHog, but every event carries is_test,
 * test_source and test_label so it can be filtered out:
 *   ?test_device=<label>   marks this browser until ?test_device=off
 *   ?test_session=<label>  marks this tab as a Claude session (Claude in Chrome)
 * The Claude desktop app's browser and other browser automation mark themselves.
 * The parameters are removed from the URL before the first page view is recorded.
 */
(function () {
    'use strict';

    var POSTHOG_KEY = 'phc_rn3Vb78ZF8eGfRBPWyenb3SEFHJyEkBHGgDGmzErhHUj'; // project 674782 (US cloud)
    var POSTHOG_HOST = 'https://us.i.posthog.com';
    var LIVE_HOSTS = ['pixelsbypavan.com', 'www.pixelsbypavan.com'];

    if (POSTHOG_KEY.indexOf('REPLACE') !== -1 || LIVE_HOSTS.indexOf(location.hostname) === -1) return;

    // Official PostHog loader (posthog.com/docs/libraries/js): defines a stub
    // that queues calls until the full library loads from PostHog's CDN.
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    var params = new URLSearchParams(location.search);
    var marking = params.get('test_device') || params.get('test_session');

    function testMark(area, param) {
        var label = params.get(param);
        params.delete(param);
        try {
            if (label === 'off') window[area].removeItem('pbp_test');
            else if (label) window[area].setItem('pbp_test', label);
            return window[area].getItem('pbp_test');
        } catch (e) {
            return label === 'off' ? null : label;
        }
    }

    var device = testMark('localStorage', 'test_device');
    var session = testMark('sessionStorage', 'test_session');

    if (marking) {
        var query = params.toString();
        history.replaceState(history.state, '', location.pathname + (query ? '?' + query : '') + location.hash);
        showTestNotice(session || device);
    }

    // Shows on the visit that sets a mark, so a phone gives the same confirmation as a laptop.
    function showTestNotice(label) {
        function show() {
            var notice = document.createElement('div');
            notice.textContent = label ? 'Analytics test mark on: ' + label : 'Analytics test mark off';
            notice.setAttribute('role', 'status');
            notice.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9999;padding:8px 12px;border-radius:6px;background:#111827;color:#fff;font-size:13px';
            document.body.appendChild(notice);
            setTimeout(function () { notice.remove(); }, 5000);
        }
        if (document.body) show();
        else document.addEventListener('DOMContentLoaded', show);
    }

    var testProps = session ? { is_test: true, test_source: 'claude', test_label: session }
        : /\bClaude\//.test(navigator.userAgent) ? { is_test: true, test_source: 'claude', test_label: 'desktop-app' }
        : device ? { is_test: true, test_source: 'device', test_label: device }
        : navigator.webdriver ? { is_test: true, test_source: 'automation', test_label: 'webdriver' }
        : null;

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2026-05-30',
        respect_dnt: true,
        // Added per event rather than with register(), which PostHog saves and shares
        // across tabs: a tab's mark would leak, and ?test_device=off wouldn't clear it.
        before_send: function (event) {
            if (event && testProps) Object.assign(event.properties, testProps);
            return event;
        }
    });
})();
