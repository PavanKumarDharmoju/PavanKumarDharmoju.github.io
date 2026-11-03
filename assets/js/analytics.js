/**
 * PostHog analytics for pixelsbypavan.com
 *
 * Records page views, page leaves and clicks (PostHog "autocapture") on every
 * page that includes this file. The Bansuri and Singing Companion tools also
 * send a few named events (tab views, drills finished, scores) through
 * window.posthog.capture.
 *
 * Setup: paste the Project API key from PostHog (Settings -> Project -> Project
 * API key, it starts with "phc_") into POSTHOG_KEY.
 *
 * Events and the PostHog library go through lens.pixelsbypavan.com instead of
 * *.posthog.com so ad blockers don't drop them. GitHub Pages can't proxy, so the
 * subdomain is PostHog's managed reverse proxy (PostHog Settings -> Project ->
 * Managed reverse proxy, plus a CNAME at the DNS provider). The proxy also
 * serves /static/array.js, which is why the loader fetches the library from
 * POSTHOG_HOST. UI_HOST keeps toolbar and app links on PostHog's US cloud.
 *
 * Nothing is sent from localhost, file:// previews or any other domain.
 */
(function () {
    'use strict';

    var POSTHOG_KEY = 'phc_rn3Vb78ZF8eGfRBPWyenb3SEFHJyEkBHGgDGmzErhHUj'; // project 674782 (US cloud)
    var POSTHOG_HOST = 'https://lens.pixelsbypavan.com'; // managed reverse proxy -> us.i.posthog.com
    var UI_HOST = 'https://us.posthog.com';
    var LIVE_HOSTS = ['pixelsbypavan.com', 'www.pixelsbypavan.com'];

    if (POSTHOG_KEY.indexOf('REPLACE') !== -1 || LIVE_HOSTS.indexOf(location.hostname) === -1) return;

    // Official PostHog loader (posthog.com/docs/libraries/js): defines a stub
    // that queues calls until the full library loads from PostHog's CDN.
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        ui_host: UI_HOST,
        defaults: '2026-05-30',
        respect_dnt: true
    });
})();
