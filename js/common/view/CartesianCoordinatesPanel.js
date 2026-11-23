/* eslint-disable phet/copyright -- Independently authored extension; GPL-3.0-only, not a CU copyright claim. */
// SPDX-License-Identifier: GPL-3.0-only
// Cartesian-coordinate extension, added 2026-11-22.

/** English-language controls for the optional Cartesian-coordinate extension. */
import BooleanProperty from '../../../../axon/js/BooleanProperty.js';
import Property from '../../../../axon/js/Property.js';
import Utils from '../../../../dot/js/Utils.js';
import PhetFont from '../../../../scenery-phet/js/PhetFont.js';
import VBox from '../../../../scenery/js/layout/nodes/VBox.js';
import RichText from '../../../../scenery/js/nodes/RichText.js';
import Text from '../../../../scenery/js/nodes/Text.js';
import AquaRadioButtonGroup from '../../../../sun/js/AquaRadioButtonGroup.js';
import TextPushButton from '../../../../sun/js/buttons/TextPushButton.js';
import Checkbox from '../../../../sun/js/Checkbox.js';
import Tandem from '../../../../tandem/js/Tandem.js';
import MoleculeShapesColors from './MoleculeShapesColors.js';
import MoleculeShapesPanel from './MoleculeShapesPanel.js';
import TextbookDiagram from './TextbookDiagram.js';

/** @author Cartesian-coordinate extension contributors */
class CartesianCoordinatesPanel extends MoleculeShapesPanel {
  constructor( frame, resetOrientation, supportsLab = true ) {
    const labProperty = new BooleanProperty( false );
    const allCoordinatesProperty = new BooleanProperty( false );
    const showProperty = new BooleanProperty( true );
    const modeProperty = new Property( 'orbit', { validValues: [ 'molecule', 'orbit' ] } );
    const lockAxesProperty = new BooleanProperty( true );
    const textbookLockedProperty = new BooleanProperty( true );
    const dragAtomsProperty = new BooleanProperty( false );
    const planeProperty = new Property( 'none', { validValues: [ 'none', 'XY', 'XZ', 'YZ' ] } );
    const text = ( value, size = 13 ) => new Text( value, {
      font: new PhetFont( size ),
      fill: MoleculeShapesColors.controlPanelTextProperty,
      maxWidth: 220
    } );

    const labCheckbox = new Checkbox( labProperty, text( 'Lab environment' ), {
      tandem: Tandem.OPT_OUT,
      boxWidth: 16,
      enabled: supportsLab,
      accessibleName: 'Lab environment',
      accessibleHelpText: 'Explore an enlarged molecular model inside a laboratory. Z is up, X and Y follow the room floor. Requires WebGL.'
    } );
    const allCoordinatesCheckbox = new Checkbox( allCoordinatesProperty, text( 'All atom coordinates', 12 ), {
      tandem: Tandem.OPT_OUT, boxWidth: 14, accessibleName: 'Show all atom coordinates'
    } );
    const textbookCheckbox = new Checkbox( textbookLockedProperty, text( 'Lock textbook orientation' ), {
      tandem: Tandem.OPT_OUT, boxWidth: 16, accessibleName: 'Lock textbook orientation',
      accessibleHelpText: 'Keep the molecule aligned with its textbook axes. Drag to orbit the camera. Turn off to rotate the molecule or deform individual atoms.'
    } );
    const showCheckbox = new Checkbox( showProperty, text( 'Show axes and coordinates' ), {
      tandem: Tandem.OPT_OUT,
      boxWidth: 16,
      accessibleName: 'Show axes and coordinates'
    } );
    const modeButtons = new AquaRadioButtonGroup( modeProperty, [
      { value: 'molecule', createNode: () => text( 'Rotate molecule' ), options: { accessibleName: 'Molecule-only rotation' } },
      { value: 'orbit', createNode: () => text( 'Look around (camera)' ), options: { accessibleName: 'Camera orbit' } }
    ], {
      tandem: Tandem.OPT_OUT,
      accessibleName: 'Rotation mode',
      radioButtonOptions: { radius: 6 },
      spacing: 7
    } );
    const lockAxesCheckbox = new Checkbox( lockAxesProperty, text( 'Lock axes to molecule' ), {
      tandem: Tandem.OPT_OUT,
      boxWidth: 16,
      accessibleName: 'Lock axes to molecule',
      accessibleHelpText: 'Keep the axes and coordinate plane fixed to the molecule when rotating it. Coordinates use the molecular frame.'
    } );
    const dragAtomsCheckbox = new Checkbox( dragAtomsProperty, text( 'Drag atoms and lone pairs' ), {
      tandem: Tandem.OPT_OUT,
      boxWidth: 16,
      accessibleName: 'Drag atoms and lone pairs',
      accessibleHelpText: 'Off: grab an atom or empty space to rotate the whole molecule. On: deform individual bonds or lone pairs and explore VSEPR relaxation.'
    } );
    const planeButtons = new AquaRadioButtonGroup( planeProperty, [ 'none', 'XY', 'XZ', 'YZ' ].map( value => ( {
      value: value,
      createNode: () => text( value === 'none' ? 'Off' : value, 12 ),
      options: { accessibleName: value === 'none' ? 'No coordinate plane' : `${value} plane` }
    } ) ), {
      tandem: Tandem.OPT_OUT,
      accessibleName: 'Coordinate plane',
      orientation: 'horizontal',
      radioButtonOptions: { radius: 5 },
      spacing: 10
    } );

    const orientationHint = text( 'Reference XY plane · Z is depth.', 11 );
    const textbookDiagram = new TextbookDiagram();
    textbookDiagram.visible = false;
    const frameText = text( 'World frame · central atom = (0, 0, 0)', 12 );
    const rows = Array.from( { length: 6 }, () => new Text( ' ', {
      font: '11px monospace',
      fill: MoleculeShapesColors.controlPanelTextProperty
    } ) );
    const readout = new VBox( { children: rows, align: 'left', spacing: 3, tagName: 'pre' } );
    const table = new VBox( { align: 'left', spacing: 8, children: [
      new Text( 'Atom      X       Y       Z', { font: '11px monospace', fill: MoleculeShapesColors.controlPanelTextProperty } ), readout
    ] } );
    const resetButton = new TextPushButton( 'Reset orientation', {
      tandem: Tandem.OPT_OUT,
      font: new PhetFont( 13 ),
      accessibleName: 'Reset orientation',
      listener: resetOrientation
    } );
    const gestureHint = text( 'Drag to look around · model units', 11 );
    const details = new VBox( {
      align: 'left',
      spacing: 3,
      children: [
        modeButtons,
        lockAxesCheckbox,
        dragAtomsCheckbox,
        textbookDiagram,
        text( 'Coordinate plane', 12 ),
        planeButtons,
        orientationHint,
        frameText,
        allCoordinatesCheckbox,
        table,
        gestureHint,
        resetButton
      ]
    } );
    const attribution = new RichText(
      'Based on <a href="https://phet.colorado.edu/en/simulation/molecule-shapes">Molecule Shapes by PhET</a>, University of Colorado Boulder.<br>' +
      'Modified 2026-11-23 · <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPLv3</a> · no warranty.', {
        links: true,
        font: new PhetFont( 9 ),
        fill: MoleculeShapesColors.controlPanelTextProperty,
        maxWidth: 238
      } );
    const labAttribution = new RichText(
      'Lab by <a href="https://sketchfab.com/raid">Raid</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a><br>' +
      '<a href="https://sketchfab.com/3d-models/lab-80d760e688c84cda8077bb53ae15956f">Original Lab model</a> · original color maps<br>Scene, lighting and materials adapted for teaching.', {
        links: true, font: new PhetFont( 9 ), fill: MoleculeShapesColors.controlPanelTextProperty, maxWidth: 238
      } );
    const content = new VBox( { children: [ labCheckbox, textbookCheckbox, showCheckbox, details, attribution, labAttribution ], align: 'left', spacing: 6 } );
    super( 'Cartesian coordinates', content, Tandem.OPT_OUT, { xMargin: 10, yMargin: 10 } );

    this.labProperty = labProperty;
    this.allCoordinatesProperty = allCoordinatesProperty;
    this.showProperty = showProperty;
    this.modeProperty = modeProperty;
    this.lockAxesProperty = lockAxesProperty;
    this.textbookLockedProperty = textbookLockedProperty;
    this.planeProperty = planeProperty;
    this.dragAtomsProperty = dragAtomsProperty;
    this.rows = rows;
    this.readout = readout;
    this.frameText = frameText;
    this.orientationHint = orientationHint;
    this.textbookDiagram = textbookDiagram;

    showProperty.link( visible => { details.visible = visible; } );
    modeProperty.link( mode => { frame.rotationMode = mode; } );
    lockAxesProperty.link( locked => { frame.lockAxesToMolecule = locked; } );
    textbookLockedProperty.link( locked => {
      frame.textbookLocked = locked;
      modeButtons.enabled = !locked;
      dragAtomsCheckbox.enabled = !locked;
      modeButtons.visible = !locked;
      dragAtomsCheckbox.visible = !locked;
      lockAxesCheckbox.visible = !locked && !labProperty.value;
      if ( locked ) { modeProperty.value = 'orbit'; dragAtomsProperty.value = false; }
      gestureHint.string = locked ? 'Unlock to explore repulsion · model units' : 'Model units · drag using selected mode';
    } );
    let studioSettings = null;
    const updateTable = () => { table.visible = !labProperty.value || allCoordinatesProperty.value; };
    allCoordinatesProperty.link( updateTable );
    labProperty.link( enabled => {
      frame.roomEnabled = enabled;
      lockAxesCheckbox.visible = !enabled && !textbookLockedProperty.value;
      allCoordinatesCheckbox.visible = enabled;
      labAttribution.visible = enabled;
      if ( enabled ) {
        studioSettings = { mode: modeProperty.value, lock: lockAxesProperty.value };
        modeProperty.value = 'orbit';
        lockAxesProperty.value = false;
      }
      else if ( studioSettings ) {
        modeProperty.value = textbookLockedProperty.value ? 'orbit' : studioSettings.mode;
        lockAxesProperty.value = studioSettings.lock;
        studioSettings = null;
      }
      updateTable();
    } );
    this.pdomOrder = [ labCheckbox, textbookCheckbox, showCheckbox, details ];
  }

  /** @public */
  update( molecule, quaternion, frame, orientation ) {
    if ( !this.showProperty.value ) { return; }
    const frameName = frame.roomEnabled ? 'Room' : frame.usesMolecularFrame ? 'Molecular' : 'World';
    this.frameText.string = `${frameName} frame · central atom = (0, 0, 0)`;
    this.textbookDiagram.update( molecule, frame, orientation );
    if ( frame.roomEnabled ) {
      this.orientationHint.string = 'Room axes: Z is up; Y is front to back.';
    }
    else {
      const { x, e } = molecule.getCentralVSEPRConfiguration();
      if ( x === 4 && e === 0 ) {
        this.orientationHint.string = 'At equilibrium: 109.5° · no opposite up/down pair';
      }
      else if ( x === 3 && e === 0 ) {
        this.orientationHint.string = 'Trigonal planar: all 3 bonds share the XY page.';
      }
      else if ( x === 3 && e === 1 ) {
        this.orientationHint.string = 'Trigonal pyramidal: 3 bonds form a pyramid below the lone pair.';
      }
      else if ( x === 3 && e >= 2 ) {
        this.orientationHint.string = 'T-shaped: 2 opposite bonds and 1 sideways bond.';
      }
      else if ( x === 4 && e === 1 ) {
        this.orientationHint.string = 'Seesaw: 2 axial bonds and 2 equatorial bonds.';
      }
      else if ( x === 4 && e === 2 ) {
        this.orientationHint.string = 'Square planar: all 4 bonds share the XY page.';
      }
      else if ( x === 5 && e === 0 ) {
        this.orientationHint.string = 'Trigonal bipyramidal: 3 equatorial bonds and 2 axial.';
      }
      else if ( x === 5 && e === 1 ) {
        this.orientationHint.string = 'Square pyramidal: 4 bonds in a square and 1 above.';
      }
      else if ( x === 6 && e === 0 ) {
        this.orientationHint.string = 'Octahedral: 6 bonds along the 3 molecular axes.';
      }
      else if ( x === 2 && e === 0 ) {
        this.orientationHint.string = 'Linear: the 2 bonds point in opposite directions.';
      }
      else if ( x === 2 && e <= 2 ) {
        this.orientationHint.string = 'Bent: both bonds share a plane; their angle is shown in 3-D.';
      }
      else if ( x === 2 ) {
        this.orientationHint.string = 'Linear: the 2 bonds oppose each other along Z.';
      }
      else if ( x === 1 ) {
        this.orientationHint.string = 'One bonded atom; remaining electron domains are lone pairs.';
      }
      else {
        this.orientationHint.string = 'XY is the page at reset; Z is the depth axis.';
      }
    }
    const lines = molecule.radialAtoms.map( ( atom, index ) => {
      const point = frame.getCoordinates( atom.positionProperty.value, molecule.centralAtom.positionProperty.value, quaternion );
      const values = [ point.x, point.y, point.z ].map( value => {
        // Avoid a misleading negative zero when rounding to two decimal places.
        return Utils.toFixed( Math.abs( value ) < 0.005 ? 0 : value, 2 ).padStart( 7 );
      } );
      return `A${index + 1} ${values.join( ' ' )}`;
    } );
    this.rows.forEach( ( row, index ) => {
      row.string = lines[ index ] || ' ';
      row.visible = index < lines.length;
    } );
    this.readout.innerContent = `${frameName} coordinates in model units\n${lines.join( '\n' ) || 'No surrounding atoms'}`;
  }

  /** @public */
  reset() {
    this.labProperty.reset();
    this.allCoordinatesProperty.reset();
    this.showProperty.reset();
    this.modeProperty.reset();
    this.lockAxesProperty.reset();
    this.planeProperty.reset();
    this.dragAtomsProperty.reset();
    this.textbookLockedProperty.reset();
  }
}

export default CartesianCoordinatesPanel;
