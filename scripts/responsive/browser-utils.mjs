import { chromium, webkit } from 'playwright';

const browserTypes = { chromium, webkit };
const knownThirdPartyAssetPattern =
  /^https?:\/\/(?:lh3\.googleusercontent\.com|cdn\.wingslashes\.com|wingslashes\.com\/uploads)\//i;
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQIwAAAABJRU5ErkJggg==',
  'base64'
);

export const getResponsiveBrowserName = (value = process.env.RESPONSIVE_BROWSER || 'chromium') => {
  const browserName = value.toLowerCase();
  if (!(browserName in browserTypes)) {
    throw new Error(
      `Unsupported RESPONSIVE_BROWSER: ${value}. Supported browsers: ${Object.keys(browserTypes).join(', ')}`
    );
  }
  return browserName;
};

export const getResponsiveBrowserType = (browserName) => browserTypes[getResponsiveBrowserName(browserName)];

export const getResponsiveContextOptions = (viewport, browserName) => ({
  viewport: { width: viewport.width, height: viewport.height },
  // WebKit touch contexts use the same mobile viewport behavior as the physical iPhone/iPad browser.
  isMobile: viewport.isMobile || (browserName === 'webkit' && viewport.hasTouch),
  hasTouch: viewport.hasTouch,
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});

export const isKnownThirdPartyAsset = (url) => knownThirdPartyAssetPattern.test(url);

export const installSanitizedAssetStubs = async (context) => {
  await context.route(knownThirdPartyAssetPattern, async (route) => {
    if (route.request().resourceType() === 'image') {
      await route.fulfill({ contentType: 'image/png', body: transparentPng });
      return;
    }

    await route.continue();
  });
};

export const createFailedRequestSummary = (captures, baseUrl, apiUrl) => {
  const failedRequests = captures.flatMap((capture) => capture.failedRequests);
  const thirdPartyAssetFailures = failedRequests.filter((request) => isKnownThirdPartyAsset(request.url));
  const unexpectedExternalFailures = failedRequests.filter(
    (request) =>
      !request.url.startsWith(baseUrl) && !request.url.startsWith(apiUrl) && !isKnownThirdPartyAsset(request.url)
  );

  return {
    capturesWithFailedRequests: captures.filter((capture) => capture.failedRequests.length > 0).length,
    capturesWithLocalFailedRequests: captures.filter((capture) =>
      capture.failedRequests.some((request) => request.url.startsWith(baseUrl) || request.url.startsWith(apiUrl))
    ).length,
    thirdPartyAssetFailures: thirdPartyAssetFailures.length,
    unexpectedExternalFailures: unexpectedExternalFailures.length,
  };
};
