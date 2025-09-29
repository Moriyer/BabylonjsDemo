import * as BABYLON from 'babylonjs';
export class DisposeObject {

    private _isDisposed = false;
    get isDisposed(): boolean {
        return this._isDisposed;
    }
    onDisposeObservable = new BABYLON.Observable<void>();
    dispose() {
        if (this._isDisposed) return;
        this._isDisposed = true;
        this.onDisposeObservable.notifyObservers();
    }
}