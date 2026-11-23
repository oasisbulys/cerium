// Copyright 2014-2026, University of Colorado Boulder
// Modified 2026-11-22: start the two-atom linear configuration on +/-X (GPL-3.0-only).

/**
 * Model for the 'Model' screen.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import Vector3 from '../../../dot/js/Vector3.js';
import MoleculeShapesModel from '../common/model/MoleculeShapesModel.js';
import PairGroup from '../common/model/PairGroup.js';
import VSEPRMolecule from '../common/model/VSEPRMolecule.js';

class ModelMoleculesModel extends MoleculeShapesModel {
  /**
   * @param {boolean} isBasicsVersion - Whether this is the Basics sim or not
   * @param {Tandem} tandem
   */
  constructor( isBasicsVersion, tandem ) {

    const initialMolecule = new VSEPRMolecule();

    super( isBasicsVersion, {
      initialMolecule: initialMolecule
    }, tandem );

    this.moleculeProperty.value.addCentralAtom( new PairGroup( new Vector3( 0, 0, 0 ), false ) );
    this.setupInitialMoleculeState();
  }

  /**
   * @private
   */
  setupInitialMoleculeState() {
    // Start with the same two single bonds in the canonical linear orientation.
    const centralAtom = this.moleculeProperty.value.centralAtom;
    this.moleculeProperty.value.addGroupAndBond( new PairGroup( new Vector3( PairGroup.BONDED_PAIR_DISTANCE, 0, 0 ), false ), centralAtom, 1 );
    this.moleculeProperty.value.addGroupAndBond( new PairGroup( new Vector3( -PairGroup.BONDED_PAIR_DISTANCE, 0, 0 ), false ), centralAtom, 1 );
  }

  /**
   * Resets values to their original state
   * @public
   * @override
   */
  reset() {
    super.reset();

    this.moleculeProperty.value.removeAllGroups();
    this.setupInitialMoleculeState();
  }
}

export default ModelMoleculesModel;
