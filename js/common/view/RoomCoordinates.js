/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22. Room directions always use a fixed world frame, relative to the central atom.
import Utils from '../../../../dot/js/Utils.js';

/** @author Cartesian-coordinate extension contributors */
const RoomCoordinates = {
  /** Plain-language room directions, rounded consistently with the displayed value. */
  describe( point ) {
    const values = [ point.x, point.y, point.z ].map( value => Utils.roundSymmetric( value * 10 ) / 10 );
    return [
      values[ 0 ] === 0 ? 'No left / right offset' : `${Utils.toFixed( Math.abs( values[ 0 ] ), 1 )} units ${values[ 0 ] > 0 ? 'right (+X)' : 'left (−X)'}`,
      values[ 1 ] === 0 ? 'No front / back offset' : `${Utils.toFixed( Math.abs( values[ 1 ] ), 1 )} units toward the ${values[ 1 ] > 0 ? 'back (+Y)' : 'front (−Y)'}`,
      values[ 2 ] === 0 ? 'Same height as the central atom' : `${Utils.toFixed( Math.abs( values[ 2 ] ), 1 )} units ${values[ 2 ] > 0 ? 'above' : 'below'} the central atom (${values[ 2 ] > 0 ? '+Z' : '−Z'})`
    ];
  }
};
export default RoomCoordinates;
