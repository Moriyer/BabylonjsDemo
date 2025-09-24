import * as BABYLON from 'babylonjs';
//Change Import Here Start
import { Playground } from '../Scene/NoiseScene';
//Change Import Here End

export function createEngine(canvas: HTMLCanvasElement): BABYLON.Engine {
    const engine = new BABYLON.Engine(canvas, true);

    const scene = Playground.CreateScene(engine, canvas);
    engine.runRenderLoop(() => {
        scene.render();
    })

    const resize = () => {
        engine.resize();
    };

    scene.debugLayer.show();

    canvas.addEventListener("resize", resize);
    engine.onDisposeObservable.add(() => {
        canvas.removeEventListener("resize", resize);
    })

    return engine;
}