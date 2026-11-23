/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only integration test. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
// SPDX-License-Identifier: GPL-3.0-only
// Verify the branded splash progress bar remains centered under the full-width custom wordmark.
const nodeAssert = require( 'node:assert/strict' );
const { chromium } = require( process.env.PLAYWRIGHT_MODULE_PATH || '../../perennial-alias/node_modules/playwright' );

const options = { headless: true, args: [ '--no-sandbox' ] };
if ( process.env.BROWSER_EXECUTABLE ) { options.executablePath = process.env.BROWSER_EXECUTABLE; }
const baseURL = process.env.SIM_BASE_URL || 'http://localhost:8080';
const simPath = process.env.SIM_PATH || '/molecule-shapes/build/cerium/molecule-shapes_en_cerium.html';

( async () => {
  const browser = await chromium.launch( options );
  try {
    const page = await browser.newPage( { viewport: { width: 1920, height: 1080 } } );
    await page.addInitScript( () => {
      const observer = new MutationObserver( () => {
        const container = document.getElementById( 'splash-container' );
        const image = container?.querySelector( 'img' );
        const bar = container?.querySelector( '#progressBarBackground' );
        if ( image?.complete && image.naturalWidth > 0 && bar && !window.splashLayoutMeasurement ) {
          const imageBounds = image.getBoundingClientRect();
          const barBounds = bar.getBoundingClientRect();
          window.splashLayoutMeasurement = {
            imageCenter: imageBounds.left + imageBounds.width / 2,
            barCenter: barBounds.left + barBounds.width / 2,
            barWidth: barBounds.width
          };
          // Keep the actual splash visible long enough for its dimensions to be measured after app startup.
          if ( window.phetSplashScreen ) { window.phetSplashScreen.dispose = () => {}; }
          observer.disconnect();
        }
      } );
      observer.observe( document, { childList: true, subtree: true } );
    } );
    await page.goto( `${baseURL}${simPath}?brand=cerium&screens=1`, { waitUntil: 'domcontentloaded' } );
    await page.waitForFunction( () => !!window.splashLayoutMeasurement, null, { timeout: 20000 } );
    const measurement = await page.evaluate( () => window.splashLayoutMeasurement );
    nodeAssert.ok( Math.abs( measurement.imageCenter - measurement.barCenter ) < 1,
      `Splash image and progress centers differ: ${JSON.stringify( measurement )}` );
    console.log( `PASS Cerium splash bar center: ${measurement.barCenter}px; wordmark center: ${measurement.imageCenter}px` );
  }
  finally { await browser.close(); }
} )().catch( error => { console.error( error ); process.exitCode = 1; } );
