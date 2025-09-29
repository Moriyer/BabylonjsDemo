import * as BABYLON from 'babylonjs';
import { getMetaData } from "../CustomMeta";

export class SceneCombineItem {
    node: BABYLON.Node;
    private _visible: boolean = true;
    get visible() {
        return this._visible;
    }
    set visible(value: boolean) {
        if (this._visible === value) return;
        this._visible = value;
        this.onParameter1ChangedObservable.notifyObservers(value);
    }
    get parameter1(): number[] {
        return [this.visible ? 1 : 0, 0, 0];
    }
    constructor(node: BABYLON.Node) {
        this.node = node;
        const meta = getMetaData(this.node);
        meta["_sceneCombineItem"] = this;
    }

    onParameter1ChangedObservable = new BABYLON.Observable<boolean>();

    static getItem(node: BABYLON.TransformNode): SceneCombineItem | null {
        const meta = getMetaData(node);
        return meta["_sceneCombineItem"] || null as SceneCombineItem | null;
    }
}