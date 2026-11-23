/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only extension. */
// SPDX-License-Identifier: GPL-3.0-only
// Added 2026-11-22. Plain-language room positions for an enlarged teaching model.
import BooleanProperty from '../../../../axon/js/BooleanProperty.js';
import Property from '../../../../axon/js/Property.js';
import PhetFont from '../../../../scenery-phet/js/PhetFont.js';
import HBox from '../../../../scenery/js/layout/nodes/HBox.js';
import VBox from '../../../../scenery/js/layout/nodes/VBox.js';
import Text from '../../../../scenery/js/nodes/Text.js';
import TextPushButton from '../../../../sun/js/buttons/TextPushButton.js';
import Checkbox from '../../../../sun/js/Checkbox.js';
import Tandem from '../../../../tandem/js/Tandem.js';
import MoleculeShapesPanel from './MoleculeShapesPanel.js';
import RoomCoordinates from './RoomCoordinates.js';

/** @author Cartesian-coordinate extension contributors */
class LabLearningPanel extends MoleculeShapesPanel {
  constructor( getMolecule ) {
    const selectedAtomProperty = new Property( 0 );
    const guidesProperty = new BooleanProperty( true );
    const text = ( value, size = 12, color = '#eeeeee' ) => new Text( value, { font: new PhetFont( size ), fill: color, maxWidth: 310 } );
    const atomName = text( 'A1', 14, '#ffe292' );
    const rows = [ text( '', 12, '#ff9191' ), text( '', 12, '#8df0ad' ), text( '', 12, '#93bfff' ) ];
    const nextButton = new TextPushButton( 'Next atom', {
      tandem: Tandem.OPT_OUT, font: new PhetFont( 12 ), accessibleName: 'Inspect next atom',
      listener: () => {
        const count = getMolecule().radialAtoms.length;
        selectedAtomProperty.value = count ? ( selectedAtomProperty.value + 1 ) % count : 0;
      }
    } );
    const content = new VBox( { spacing: 5, align: 'left', children: [
      new HBox( { spacing: 15, children: [ atomName, nextButton, new Checkbox( guidesProperty, text( 'Guides', 11 ), {
        boxWidth: 14, tandem: Tandem.OPT_OUT, accessibleName: 'Show atom position guides'
      } ) ] } ),
      ...rows,
      text( 'Blue Z = up · model units, not metres', 10 )
    ] } );
    super( 'Where is this atom?', content, Tandem.OPT_OUT, { xMargin: 10, yMargin: 8 } );
    this.selectedAtomProperty = selectedAtomProperty;
    this.guidesProperty = guidesProperty;
    this.atomName = atomName;
    this.rows = rows;
    this.nextButton = nextButton;
    this.accessibleParagraph = '';
    // Keep changing spatial descriptions accessible without announcing every simulation frame.
    content.accessibleParagraph = 'Select an atom in the molecule or use Next atom to inspect its room position.';
  }

  /** @public */
  update( molecule, point ) {
    const count = molecule.radialAtoms.length;
    if ( this.selectedAtomProperty.value >= count ) { this.selectedAtomProperty.value = 0; }
    this.nextButton.enabled = count > 1;
    this.atomName.string = count ? `A${this.selectedAtomProperty.value + 1} · room position` : 'Add an atom to inspect';
    const lines = count && point ? RoomCoordinates.describe( point ) : [ 'No surrounding atoms', '', '' ];
    this.rows.forEach( ( row, index ) => { row.string = lines[ index ]; } );
    this.accessibleParagraph = `${this.atomName.string}. ${lines.join( '. ' )}. Model units.`;
  }
}
export default LabLearningPanel;
