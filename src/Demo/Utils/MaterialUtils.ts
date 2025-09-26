import * as BABYLON from 'babylonjs';

export function getMaterialOnChangedObservable(material: BABYLON.Material): BABYLON.Observable<{ property: string, value: any }> {
    const mat = material as any;
    if (!mat._onPropertyChangedObservable) {
        mat._onPropertyChangedObservable = new BABYLON.Observable<{ property: string, value: any }>();
    }
    return mat._onPropertyChangedObservable;
}