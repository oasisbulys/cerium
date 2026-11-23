/* eslint-disable */
/* @formatter:off */

// Copyright 2026, Cerium Project. Licensed under GPL-3.0-only.
// @author Cerium Project
import asyncLoader from '../../../phet-core/js/asyncLoader.js';

const image = new Image();
const unlock = asyncLoader.createLock( image );
image.onload = unlock;
image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><text x="4" y="65" font-family="Arial,Helvetica,sans-serif" font-size="67" font-weight="700" letter-spacing="-1" fill="#ffffff">Cerium</text></svg>'
);
export default image;
