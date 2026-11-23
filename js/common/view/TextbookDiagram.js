/* eslint-disable phet/copyright -- Independently authored GPL-3.0-only educational diagram. */
// SPDX-License-Identifier: GPL-3.0-only
import Bounds2 from '../../../../dot/js/Bounds2.js';
import Shape from '../../../../kite/js/Shape.js';
import PhetFont from '../../../../scenery-phet/js/PhetFont.js';
import Circle from '../../../../scenery/js/nodes/Circle.js';
import Line from '../../../../scenery/js/nodes/Line.js';
import Node from '../../../../scenery/js/nodes/Node.js';
import Path from '../../../../scenery/js/nodes/Path.js';
import Text from '../../../../scenery/js/nodes/Text.js';
import TextbookGeometry from './TextbookGeometry.js';
import TextbookReference from './TextbookReference.js';

const COLORS = { plane: '#eeeeee', toward: '#8dc4ff', away: '#ffc88d' };

/** Equilibrium drawings using the same domain assignment and atom IDs as the 3-D view.
 * @author Cartesian-coordinate extension contributors
 */
class TextbookDiagram extends Node {
  constructor() {
    super( { pickable: false, localBounds: new Bounds2( 0, 0, 220, 140 ) } );
    this.key = '';
    this.entries = [];
    this.atomLabels = [];
  }

  /** @public - Camera orbit never changes the page, atom assignment, or wedge/dash meaning. */
  update( molecule, frame, orientation ) {
    this.visible = frame.textbookLocked && !frame.roomEnabled && frame.usesMolecularFrame;
    if ( !this.visible ) { return; }
    const configuration = molecule.getCentralVSEPRConfiguration();
    const { x, e } = configuration;
    const indices = orientation.permutation ? orientation.permutation.indices : molecule.radialGroups.map( ( group, index ) => index );
    const name = configuration.moleculeGeometry.stringProperty.value || 'Electron domains';
    const key = `${x},${e}:${molecule.radialGroups.map( group => group.id ).join( ',' )}:${indices.join( ',' )}:${name}`;
    if ( key === this.key ) { return; }
    this.key = key;
    this.children.slice().forEach( child => child.dispose() );
    const label = ( value, px, py, color = '#eeeeee', size = 10 ) => {
      const text = new Text( value, { font: new PhetFont( size ), fill: color, maxWidth: 218, centerX: px, centerY: py } );
      this.addChild( text );
      return text;
    };
    const directions = TextbookGeometry( configuration.allOrientations, x, e );
    this.reference = TextbookReference( directions, x, e );
    const reference = this.reference;
    const formula = `AX${x}${e ? `E${e}` : ''}`;
    label( `Match the book: ${name.toLowerCase()} ${formula}`, 110, 5 );
    label( 'Ideal sketch · line = page · dots = lone pair', 110, 100, '#dddddd', 9 );
    this.entries = molecule.radialGroups.map( ( group, index ) => {
      const direction = directions[ indices[ index ] ];
      const depth = direction[ reference.depthAxis ] * reference.depthSign;
      const role = Math.abs( depth ) < 1e-6 ? 'plane' : depth > 0 ? 'toward' : 'away';
      const vertical = reference.page === 'XY' ? direction.y : direction.z;
      // Spread depth directions in this schematic; drawn angles are not measurements.
      const tetrahedralPage = reference.page === 'XY' && directions.length === 4;
      const fiveDomains = reference.page === 'XZ' && directions.length === 5;
      const px = 110 + direction.x * 62 + depth * ( tetrahedralPage ? 52 : fiveDomains ? 0 : 35 );
      const py = 53 - vertical * 25 + ( tetrahedralPage ? 0 : depth * ( fiveDomains ? 24 : 16 ) );
      return { id: group.isLonePair ? `LP${molecule.radialLonePairs.indexOf( group ) + 1}` : `A${molecule.radialAtoms.indexOf( group ) + 1}`,
        lonePair: group.isLonePair, groupId: group.id, slot: indices[ index ], direction: direction, depth: depth,
        role: role, x: px, y: py };
    } );
    // Retain semantic left / right / toward / away ordering for tetrahedral atom labels.
    const order = { plane: 0, toward: 1, away: 2 };
    this.entries.sort( ( a, b ) => order[ a.role ] - order[ b.role ] || a.x - b.x || a.y - b.y );
    this.atomLabels = [];
    this.entries.forEach( entry => {
      const dx = entry.x - 110; const dy = entry.y - 53;
      const length = Math.sqrt( dx * dx + dy * dy );
      const nx = -dy / length; const ny = dx / length;
      const color = COLORS[ entry.role ];
      if ( entry.lonePair ) {
        // Paired electron dots are never rendered as additional bonds or bonded atoms.
        const ux = dx / length; const uy = dy / length;
        const baseX = 110 + ux * 6; const baseY = 53 + uy * 6;
        const tipX = entry.x + ux * 4; const tipY = entry.y + uy * 4;
        const lobe = new Shape().moveTo( baseX, baseY )
          .cubicCurveTo( baseX + dx * 0.45 + nx * 9, baseY + dy * 0.45 + ny * 9,
            entry.x + nx * 10, entry.y + ny * 10, tipX, tipY )
          .cubicCurveTo( entry.x - nx * 10, entry.y - ny * 10,
            baseX + dx * 0.45 - nx * 9, baseY + dy * 0.45 - ny * 9, baseX, baseY ).close();
        this.addChild( new Path( lobe, { fill: { plane: 'rgba(176,133,221,0.25)', toward: 'rgba(141,196,255,0.25)', away: 'rgba(255,200,141,0.15)' }[ entry.role ], stroke: entry.role === 'plane' ? '#b085dd' : color, lineWidth: 1,
          lineDash: entry.role === 'away' ? [ 2, 2 ] : [] } ) );
        [ -2.8, 2.8 ].forEach( offset => this.addChild( new Circle( 1.7, {
          fill: '#ffe28d', centerX: entry.x + nx * offset, centerY: entry.y + ny * offset
        } ) ) );
      }
      else if ( entry.role === 'plane' ) {
        this.addChild( new Line( 110, 53, entry.x, entry.y, { stroke: color, lineWidth: 2 } ) );
      }
      else if ( entry.role === 'toward' ) {
        this.addChild( new Path( new Shape().moveTo( 110, 53 )
          .lineTo( entry.x + nx * 5, entry.y + ny * 5 ).lineTo( entry.x - nx * 5, entry.y - ny * 5 ).close(), { fill: color } ) );
      }
      else {
        for ( let i = 1; i <= 7; i++ ) {
          const t = i / 7; const px = 110 + dx * t; const py = 53 + dy * t;
          this.addChild( new Line( px - nx * 5 * t, py - ny * 5 * t, px + nx * 5 * t, py + ny * 5 * t,
            { stroke: color, lineWidth: 1.5 } ) );
        }
      }
      const atomLabel = label( entry.id, entry.x + dx / length * 12, entry.y + dy / length * 9,
        entry.lonePair && entry.role === 'plane' ? '#ffe28d' : color, 9 );
      if ( !entry.lonePair ) { this.atomLabels.push( atomLabel ); }
    } );
    this.addChild( new Circle( 5, { fill: '#8149ae', centerX: 110, centerY: 53 } ) );
    if ( !this.entries.length ) { label( 'Add bonds or lone pairs to build a shape.', 110, 77, '#dddddd', 9 ); }
    label( 'dashes: away', 55, 111, COLORS.away, 9 );
    label( 'wedge: toward', 165, 111, COLORS.toward, 9 );
    label( `Page ${reference.page} · toward ${reference.from} · up ${reference.up}`, 110, 122, '#dddddd', 9 );
    label( `Best view: ${reference.hasDepth ? 'near' : 'from'} ${reference.from}${reference.hasDepth ? ' side (angled)' : ''}`, 110, 134, '#bce9c9', 10 );
    const descriptions = this.entries.map( entry => `${entry.lonePair ? `Lone pair ${entry.id}` : entry.id}: ${entry.role === 'plane' ?
      `in the ${reference.page} page` : entry.role === 'toward' ? `${entry.lonePair ? 'in front of the page' : 'solid wedge toward you'} (${reference.from})` :
      `${entry.lonePair ? 'behind the page' : 'dashes away from you'} (opposite ${reference.from})`}` );
    this.accessibleParagraph = `${name} ${formula} equilibrium reference drawing. ${descriptions.join( '; ' )}. ` +
      `Paired dots represent lone pairs. Best view ${reference.hasDepth ? 'near' : 'from'} ${reference.from}, with ${reference.up} up. ` +
      'Reset orientation restores this view. This drawing is schematic; use the 3D bond-angle display for measurements. ' +
      'Orbiting changes your viewpoint, not the reference page or molecular coordinates.';
  }
}

export default TextbookDiagram;
