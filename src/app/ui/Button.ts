import { FancyButton } from "@pixi/ui";
import type { FederatedPointerEvent } from "pixi.js";
import { Rectangle } from "pixi.js";

import { engine } from "../getEngine.ts";

import { Label } from "./Label.ts";

const defaultButtonOptions = {
  text: "",
  width: 301,
  height: 112,
  fontSize: 28,
};

type ButtonOptions = typeof defaultButtonOptions;

/**
 * The big rectangle button, with a label, idle and pressed states
 */
export class Button extends FancyButton {
  private isPointerDown = false;

  constructor(options: Partial<ButtonOptions> = {}) {
    const opts = { ...defaultButtonOptions, ...options };

    super({
      defaultView: "button.png",
      nineSliceSprite: [38, 50, 38, 50],
      anchor: 0.5,
      text: new Label({
        text: opts.text,
        style: {
          fill: 0x4a4a4a,
          align: "center",
          fontSize: opts.fontSize,
        },
      }),
      textOffset: { x: 0, y: -13 },
      defaultTextAnchor: 0.5,
      scale: 0.9,
      animations: {
        hover: {
          props: {
            scale: { x: 1.03, y: 1.03 },
            y: 0,
          },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
            y: 10,
          },
          duration: 100,
        },
      },
    });

    // @pixi/ui chooses mouse or pointer listeners from user-agent detection.
    // Use one pointer event path so touch devices and device emulation behave alike.
    this.removeAllListeners();
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.handlePointerDown, this);
    this.on("pointerup", this.handlePointerUp, this);
    this.on("pointerupoutside", this.handlePointerUpOutside, this);
    this.on("pointercancel", this.handlePointerUpOutside, this);
    this.on("pointertap", this.handlePointerTap, this);
    this.on("pointerover", this.handlePointerOver, this);
    this.on("pointerout", this.handlePointerOut, this);
    this.setSize(opts.width, opts.height);

    this.onDown.connect(this.handleDown.bind(this));
    this.onHover.connect(this.handleHover.bind(this));
  }

  public override setSize(width: number, height: number) {
    super.setSize(width, height);
    this.hitArea = new Rectangle(-width * 0.5, -height * 0.5, width, height);
  }

  private handlePointerDown(event: FederatedPointerEvent) {
    if (!this.enabled) return;

    this.isPointerDown = true;
    this.onDown.emit(this.button, event);
  }

  private handlePointerUp(event: FederatedPointerEvent) {
    if (!this.isPointerDown) return;

    this.isPointerDown = false;
    this.onUp.emit(this.button, event);
  }

  private handlePointerUpOutside(event: FederatedPointerEvent) {
    if (!this.isPointerDown) return;

    this.isPointerDown = false;
    this.onUp.emit(this.button, event);
    this.onUpOut.emit(this.button, event);
  }

  private handlePointerTap(event: FederatedPointerEvent) {
    if (!this.enabled) return;

    this.isPointerDown = false;
    this.onPress.emit(this.button, event);
  }

  private handlePointerOver(event: FederatedPointerEvent) {
    if (event.pointerType === "mouse") {
      this.onHover.emit(this.button, event);
    }
  }

  private handlePointerOut(event: FederatedPointerEvent) {
    if (!this.isPointerDown) {
      this.onOut.emit(this.button, event);
    }
  }

  private handleHover() {
    engine().audio.sfx.play("main/sounds/sfx-hover.wav");
  }

  private handleDown() {
    engine().audio.sfx.play("main/sounds/sfx-press.wav");
  }
}
