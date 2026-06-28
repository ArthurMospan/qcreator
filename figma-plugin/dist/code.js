"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"(exports) {
      figma.showUI(__html__, { width: 300, height: 400 });
      function rgbaToHex(paint) {
        const r = Math.round(paint.color.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(paint.color.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(paint.color.b * 255).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`.toUpperCase();
      }
      function parseNode(node) {
        if (node.visible === false)
          return null;
        const res = {
          id: node.id,
          name: node.name,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height
        };
        const match = node.name.match(/\[(.*?)\]/);
        if (match) {
          res.slot = match[1].toLowerCase();
        }
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
          const frame = node;
          res.clipsContent = frame.clipsContent;
          res.cornerRadius = typeof frame.cornerRadius === "number" ? frame.cornerRadius : 0;
          if (frame.layoutMode !== "NONE") {
            res.layoutMode = frame.layoutMode;
            res.primaryAxisSizingMode = frame.primaryAxisSizingMode;
            res.counterAxisSizingMode = frame.counterAxisSizingMode;
            res.primaryAxisAlignItems = frame.primaryAxisAlignItems;
            res.counterAxisAlignItems = frame.counterAxisAlignItems;
            res.paddingTop = frame.paddingTop;
            res.paddingRight = frame.paddingRight;
            res.paddingBottom = frame.paddingBottom;
            res.paddingLeft = frame.paddingLeft;
            res.itemSpacing = frame.itemSpacing;
          }
          if (frame.fills !== figma.mixed && frame.fills.length > 0) {
            const fill = frame.fills[0];
            if (fill.type === "SOLID")
              res.backgroundColor = rgbaToHex(fill);
          }
          res.children = frame.children.map(parseNode).filter(Boolean);
        }
        if (node.type === "TEXT") {
          const text = node;
          res.characters = text.characters;
          res.fontSize = typeof text.fontSize === "number" ? text.fontSize : 16;
          res.fontName = typeof text.fontName !== "symbol" ? text.fontName : null;
          res.textAlignHorizontal = text.textAlignHorizontal;
          res.textAlignVertical = text.textAlignVertical;
          res.lineHeight = text.lineHeight;
          if (text.fills !== figma.mixed && text.fills.length > 0) {
            const fill = text.fills[0];
            if (fill.type === "SOLID")
              res.color = rgbaToHex(fill);
          }
        }
        if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
          const shape = node;
          if (shape.fills !== figma.mixed && shape.fills.length > 0) {
            const fill = shape.fills[0];
            if (fill.type === "SOLID")
              res.backgroundColor = rgbaToHex(fill);
            else if (fill.type === "IMAGE")
              res.isImage = true;
          }
          if (shape.type === "RECTANGLE") {
            res.cornerRadius = typeof shape.cornerRadius === "number" ? shape.cornerRadius : 0;
          } else {
            res.isEllipse = true;
          }
        }
        return res;
      }
      figma.ui.onmessage = (msg) => __async(exports, null, function* () {
        if (msg.type === "export") {
          const selection = figma.currentPage.selection;
          if (selection.length !== 1 || selection[0].type !== "FRAME" && selection[0].type !== "COMPONENT") {
            figma.ui.postMessage({ type: "error", message: "Please select exactly one Frame to export." });
            return;
          }
          const frame = selection[0];
          const layout = parseNode(frame);
          const slots = {
            headline: { enabled: true, removable: false, max: 100 },
            body: { enabled: true, removable: true, max: 400 },
            cta: { enabled: true, removable: true, max: 50 },
            photo: { enabled: true, removable: false }
          };
          const brand = {
            primary: "#2D1B3D",
            accent: "#E8B04B",
            bg: "#FFFFFF",
            logoText: "FIGMA",
            palette: ["#2D1B3D", "#E8B04B", "#1A1A1A", "#FFFFFF"]
          };
          figma.ui.postMessage({
            type: "export-result",
            layout,
            slots,
            brand
          });
        }
      });
    }
  });
  require_code();
})();
