import type { SceneDefinition } from '../scene/build-scene.js';
import { definitionId } from './identifiers.js';

import type { SvgNode } from './node.js';

export function describeDefinitions(definitions: readonly SceneDefinition[], prefix: string): SvgNode {
  return {
    name: 'defs',
    attributes: {},
    children: definitions.map(definition => {
      const id = definitionId(prefix, definition.slot);
      if (definition.kind === 'clip') {
        return {
          name: 'clipPath',
          attributes: { id, clipPathUnits: 'userSpaceOnUse' },
          children: definition.bounds.map(bounds => ({ name: 'rect', attributes: { ...bounds } })),
        };
      }
      if (definition.kind === 'gradient') {
        const { direction } = definition;
        return {
          name: 'linearGradient',
          attributes: { id, x1: 0, y1: direction === 'up' ? 1 : 0, x2: direction === 'right' ? 1 : 0, y2: direction === 'down' ? 1 : 0 },
          children: definition.stops.map(({ offset, color }) => ({
            name: 'stop',
            attributes: { offset, 'stop-color': color },
          })),
        };
      }
      return {
        name: 'filter',
        attributes: { id },
        children: [{
          name: 'feDropShadow',
          attributes: {
            dx: definition.horizontal ? 0 : 1,
            dy: definition.horizontal ? 1 : 0,
            stdDeviation: 0.7,
            'flood-opacity': definition.opacity,
          },
        }],
      };
    }),
  };
}
