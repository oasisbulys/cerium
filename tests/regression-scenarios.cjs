/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension tests. */
/** @author Cartesian-coordinate extension contributors */
'use strict';
// SPDX-License-Identifier: GPL-3.0-only
// Deterministic scenarios shared by upstream baseline capture and the modified simulation's regression test.
module.exports = function collectRegressionScenarios() {
  const sim = phet.joist.sim;
  const model = sim.simScreens[ 0 ].model;
  const example = model.moleculeProperty.value;
  const PairGroup = example.centralAtom.constructor;
  const Vector3 = example.centralAtom.positionProperty.value.constructor;
  const VSEPRMolecule = example.constructor;
  const Configuration = example.getCentralVSEPRConfiguration().constructor;
  const snapshot = molecule => ( {
    domains: molecule.radialGroups.length,
    atoms: molecule.radialAtoms.length,
    lonePairs: molecule.radialLonePairs.length,
    outerLonePairs: molecule.getDistantLonePairs().length,
    positions: molecule.groups.map( group => {
      const p = group.positionProperty.value;
      return [ p.x, p.y, p.z ];
    } ),
    velocities: molecule.groups.map( group => {
      const p = group.velocityProperty.value;
      return [ p.x, p.y, p.z ];
    } ),
    orders: molecule.bonds.map( bond => bond.order ),
    angles: molecule.radialAtoms.flatMap( ( a, i ) => molecule.radialAtoms.slice( i + 1 ).map( b =>
      a.positionProperty.value.minus( molecule.centralAtom.positionProperty.value ).angleBetween(
        b.positionProperty.value.minus( molecule.centralAtom.positionProperty.value ) ) * 180 / Math.PI ) )
  } );
  const result = {};
  for ( let x = 0; x <= 6; x++ ) {
    for ( let e = 0; x + e <= 6; e++ ) {
      const configuration = Configuration.getConfiguration( x, e );
      const molecule = new VSEPRMolecule();
      molecule.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
      configuration.allOrientations.forEach( ( v, i ) => {
        const lonePair = i < e;
        const position = new Vector3( v.x + 0.03 * ( i + 1 ), v.y - 0.02 * ( i + 1 ), v.z + 0.01 * ( i + 1 ) );
        position.setMagnitude( lonePair ? PairGroup.LONE_PAIR_DISTANCE : PairGroup.BONDED_PAIR_DISTANCE );
        molecule.addGroupAndBond( new PairGroup( position, lonePair ), molecule.centralAtom, lonePair ? 0 : ( i % 3 ) + 1 );
      } );
      const entry = [ snapshot( molecule ) ];
      for ( let step = 1; step <= 30; step++ ) {
        molecule.update( 1 / 60 );
        if ( [ 1, 8, 30 ].includes( step ) ) { entry.push( snapshot( molecule ) ); }
      }
      result[ `AX${x}E${e}` ] = entry;
    }
  }
  const realModel = sim.simScreens[ 1 ].model;
  const RealMolecule = realModel.moleculeProperty.value.constructor;
  realModel.realMoleculeShapeProperty.validValues.forEach( shape => {
    const molecule = new RealMolecule( shape );
    const entry = [ snapshot( molecule ) ];
    for ( let step = 0; step < 30; step++ ) { molecule.update( 1 / 60 ); }
    entry.push( snapshot( molecule ) );
    result[ shape.displayName ] = entry;
  } );
  return result;
};
