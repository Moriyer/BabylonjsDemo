import * as BABYLON from 'babylonjs';

interface IInspectorNodeRef {
    getClassName(): string;
    copyFrom(source: any): void;
}

export class InspectorNode extends BABYLON.TransformNode {
    constructor(name: string, scene: BABYLON.Scene) {
        super(name, scene);
        this.inspectableCustomProperties = [];
    }

    addNumber(label: string, name: string, value: number, onValueChange: (value: number) => void, options?: {
        min: number,
        max: number,
        step: number,
    }) {
        InspectorNode.addNumber(this, label, name, value, onValueChange, options);
    }

    static addNumber(nodeTarget: any, label: string, name: string, value: number, onValueChange: (value: number) => void, options?: {
        min: number,
        max: number,
        step: number,
    }) {
        options = {
            min: 0,
            max: 1,
            step: 0.01,
            ...options
        };
        const scope = nodeTarget;
        const key = `_name`;
        scope[key] = value;

        //给this添加get/set
        Object.defineProperty(scope, name, {
            get: () => {
                return scope[key];
            },
            set: (v) => {
                scope[key] = v;
                onValueChange(v);
            }
        })
        nodeTarget.inspectableCustomProperties ||= [];
        nodeTarget.inspectableCustomProperties.push({
            label,
            propertyName: name,
            type: BABYLON.InspectableType.Slider,
            min: options.min,
            max: options.max,
            step: options.step,
        });
    }

    addRefNumber(label: string, name: string, target: any, propertyName: string, onValueChange: (v: any) => void, options?: {
        min: number,
        max: number,
        step: number,
    }) {
        InspectorNode.addRefNumber(this, label, name, target, propertyName, onValueChange, options);
    }

    static addRefNumber(nodeTarget: any, label: string, name: string, target: any, propertyName: string, onValueChange: (v: any) => void, options?: {
        min: number,
        max: number,
        step: number,
    }) {
        const scope = nodeTarget;
        options = {
            min: 0,
            max: 1,
            step: 0.01,
            ...options
        };
        Object.defineProperty(scope, name, {
            get: () => {
                return target[propertyName];
            },
            set: (v) => {
                target[propertyName] = v;
                onValueChange(v);
            }
        })
        nodeTarget.inspectableCustomProperties ||= [];
        nodeTarget.inspectableCustomProperties.push({
            label,
            propertyName: name,
            type: BABYLON.InspectableType.Slider,
            min: options.min,
            max: options.max,
            step: options.step,
        });
    }

    addRef<T extends IInspectorNodeRef>(label: string, name: string, value: T, onValueChange?: (v: T) => void) {
        InspectorNode.addRef(this, label, name, value, onValueChange);
    }
    static addRef<T extends IInspectorNodeRef>(nodeTarget: any, label: string, name: string, value: T, onValueChange?: (v: T) => void) {
        const scope = nodeTarget;
        scope[name] = value;
        const className = value.getClassName();
        let type: number = 0;
        switch (className) {
            case "Vector2":
                type = BABYLON.InspectableType.Vector2;
                break;
            case "Vector3":
                type = BABYLON.InspectableType.Vector3;
                break;
            case "Color3":
                type = BABYLON.InspectableType.Color3;
                break;
            default:
                console.log(`不支持的类型:${className}`);
                return;
        }
        // console.log(className);
        //给this添加get/set
        Object.defineProperty(scope, name, {
            get: () => {
                return value;
            },
            set: (v) => {
                value.copyFrom(v);
                if (onValueChange) {
                    onValueChange(v);
                }
            }
        })
        nodeTarget.inspectableCustomProperties ||= [];
        nodeTarget.inspectableCustomProperties.push({
            label,
            propertyName: name,
            type,
        });
    }

    addButton(label: string, name: string, onClick: () => void) {
        InspectorNode.addButton(this, label, name, onClick);
    }

    static addButton(nodeTarget: any, label: string, name: string, onClick: () => void) {
        nodeTarget.inspectableCustomProperties ||= [];
        nodeTarget.inspectableCustomProperties.push({
            label,
            propertyName: name,
            type: BABYLON.InspectableType.Button,
            callback: onClick,
        });
    }

    addHash2(name = "HashSeed", name1: string, name2: string) {
        const scope = this as any;
        scope[name] = new BABYLON.Vector2();
        this.addNumber(name1, name1, scope[name].x, (v) => {
            scope[name].x = v;
        })
        this.addNumber(name2, name2, scope[name].y, (v) => {
            scope[name].y = v;
        })
    }

    addHash3(name = "HashSeed", name1: string, name2: string, name3: string) {
        const scope = this as any;
        scope[name] = new BABYLON.Vector3();
        this.addNumber(name1, name1, scope[name].x, (v) => {
            scope[name].x = v;
        })
        this.addNumber(name2, name2, scope[name].y, (v) => {
            scope[name].y = v;
        })
        this.addNumber(name3, name3, scope[name].z, (v) => {
            scope[name].z = v;
        })
    }




}