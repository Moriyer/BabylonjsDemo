import * as BABYLON from 'babylonjs';
import { DisposeObject } from "./DisposeObject";

class MouseButton {
    private _isDown = false;
    get isDown() { return this._isDown; }
    private _isDownDownMove = false;
    get isDownDownMove() { return this._isDownDownMove; }

    private _button;
    constructor(button: number) {
        this._button = button;
    }

    update(info: BABYLON.PointerInfo) {
        if (info.event.button !== this._button) return;

        const tap = info.type & BABYLON.PointerEventTypes.POINTERTAP;
        if (tap) {
            // console.log("tap", info)
        }
        const double = info.type & BABYLON.PointerEventTypes.POINTERDOUBLETAP;
        if (double) {
            this.onDoubleObservable.notifyObservers(info);
            return;
        }
        const down = info.type & BABYLON.PointerEventTypes.POINTERDOWN;
        if (down) {
            this._isDown = true;
            this.onDownObservable.notifyObservers(info);
            return;
        }
        const up = info.type & BABYLON.PointerEventTypes.POINTERUP;
        if (up) {
            this._isDown = false;
            this.onUpObservable.notifyObservers(info);
            return;
        }

        // const wheel = info.type & BABYLON.PointerEventTypes.POINTERWHEEL;
        // const DownDown = info.type & BABYLON.PointerEventTypes.POINTERDownDown;

        // if (info.type === 1) {

        // }
    }

    updateMove(info: BABYLON.PointerInfo) {
        if (this._isDown) {
            this.onDownMoveObservable.notifyObservers(info);
            return;
        }
    }

    onUpObservable: BABYLON.Observable<BABYLON.PointerInfo> = new BABYLON.Observable<BABYLON.PointerInfo>();
    onDownObservable: BABYLON.Observable<BABYLON.PointerInfo> = new BABYLON.Observable<BABYLON.PointerInfo>();
    onDoubleObservable: BABYLON.Observable<BABYLON.PointerInfo> = new BABYLON.Observable<BABYLON.PointerInfo>();
    onDownMoveObservable: BABYLON.Observable<BABYLON.PointerInfo> = new BABYLON.Observable<BABYLON.PointerInfo>();

}

export class MousePicker extends DisposeObject {
    leftButton = new MouseButton(0);
    middleButton = new MouseButton(1);
    rightButton = new MouseButton(2);

    constructor(scene: BABYLON.Scene) {
        super();

        const observer = scene.onPointerObservable.add((ed, es) => {
            this.leftButton.update(ed);
            const move = ed.type & BABYLON.PointerEventTypes.POINTERMOVE;
            if (move) {
                this.leftButton.updateMove(ed);
                this.middleButton.updateMove(ed);
                this.rightButton.updateMove(ed);
            }
        })

        this.onDisposeObservable.add(() => {
            scene.onPointerObservable.remove(observer);
        })
    }

    private leftDown = false;
    private middleDown = false;
    private rightDown = false;
}