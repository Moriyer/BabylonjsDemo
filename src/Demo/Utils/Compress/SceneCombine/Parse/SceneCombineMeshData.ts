import { DataUtils } from '@/Demo/Utils/DataUtils';
import { DataTexture } from '@/Demo/Utils/Texture/DataTexture';
import * as BABYLON from 'babylonjs';
export class SceneCombineMeshData {
    dataTexture: DataTexture;
    index: number;
    color = new BABYLON.Color3(1, 1, 1);
    private _visible = true;
    get visible() {
        return this._visible;
    }
    set visible(v: boolean) {
        this._visible = v;
        this.onValueChanged();
    }
    constructor(node: BABYLON.Node, index: number, dataTexture: DataTexture) {
        (node as any)._c_SceneCombineMeshData = this;
        // this.color.set(Math.random(), Math.random(), Math.random());
        DataUtils.onUpdateCallBack(this.color, () => {
            this.onValueChanged();
        })
        this.dataTexture = dataTexture;
        this.index = index;
        this.onValueChanged();
    }

    getData() {
        return [
            this.color.r, this.color.g, this.color.b,
            this.visible ? 1 : 0, 0, 0
        ]
    }
    private onValueChanged() {
        this.dataTexture.setFullData(this.index, this.getData());
    }

    static dataCount = 2;
    static getData(node: BABYLON.Node) {
        return (node as any)._c_SceneCombineMeshData;
    }
}