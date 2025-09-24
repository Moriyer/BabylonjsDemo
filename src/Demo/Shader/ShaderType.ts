import * as BABYLON from 'babylonjs';
import { InspectorNode } from "../Node/InspectorNode";

export interface IShaderPartResult {
    define?: string;
    main?: string;
    applyToNode: (node: InspectorNode) => void;
    applyToMaterial: (material: BABYLON.ShaderMaterial) => void;
}
export interface IShaderPart {
    uniforms: string[];
    samplers: string[];
    attributes: string[];
}