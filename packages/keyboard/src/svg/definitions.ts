import type { SceneDefinition } from '../scene/build-scene.js';
import { definitionId } from './identifiers.js';

type Attributes = Readonly<Record<string, string | number>>;

interface SvgDefinitionNode {
  readonly name: 'defs' | 'linearGradient' | 'stop' | 'filter' | 'feDropShadow';
  readonly attributes: Attributes;
  readonly children?: readonly SvgDefinitionNode[];
}

export function describeDefinitions(definitions: readonly SceneDefinition[], prefix: string): SvgDefinitionNode {
  return {
    name: 'defs',
    attributes: {},
    children: definitions.map(definition => {
      const id = definitionId(prefix, definition.slot);
      if (definition.kind === 'gradient') {
        return {
          name: 'linearGradient',
          attributes: { id, x1: 0, y1: 0, x2: definition.horizontal ? 0 : 1, y2: definition.horizontal ? 1 : 0 },
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
