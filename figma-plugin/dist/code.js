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
      figma.showUI(__html__, { width: 320, height: 440 });
      function rgbaToHex(color, opacity) {
        const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
        const a = ("a" in color ? color.a : 1) * (opacity != null ? opacity : 1);
        if (a >= 1)
          return `#${r}${g}${b}`;
        const aHex = Math.round(a * 255).toString(16).padStart(2, "0");
        return `#${r}${g}${b}${aHex}`;
      }
      function rgbaCss(color, opacity) {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const a = ("a" in color ? color.a : 1) * (opacity != null ? opacity : 1);
        return `rgba(${r},${g},${b},${a})`;
      }
      function luminance(hex) {
        const c = hex.replace("#", "").slice(0, 6);
        const r = parseInt(c.slice(0, 2), 16) / 255;
        const g = parseInt(c.slice(2, 4), 16) / 255;
        const b = parseInt(c.slice(4, 6), 16) / 255;
        const lin = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      }
      function paintToCss(paint) {
        if (paint.visible === false)
          return null;
        if (paint.type === "SOLID") {
          return rgbaCss(paint.color, paint.opacity);
        }
        if (paint.type === "GRADIENT_LINEAR") {
          const stops = paint.gradientStops.map((s) => `${rgbaCss(s.color, paint.opacity)} ${Math.round(s.position * 100)}%`).join(", ");
          const [[a, b]] = paint.gradientTransform;
          const angle = Math.round(Math.atan2(b, a) * 180 / Math.PI) + 90;
          return `linear-gradient(${angle}deg, ${stops})`;
        }
        if (paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_DIAMOND") {
          const stops = paint.gradientStops.map((s) => `${rgbaCss(s.color, paint.opacity)} ${Math.round(s.position * 100)}%`).join(", ");
          return `radial-gradient(circle, ${stops})`;
        }
        return null;
      }
      function effectsToCss(effects) {
        const shadows = [];
        for (const e of effects) {
          if (!e.visible)
            continue;
          if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
            const inset = e.type === "INNER_SHADOW" ? "inset " : "";
            shadows.push(`${inset}${e.offset.x}px ${e.offset.y}px ${e.radius}px ${"spread" in e ? e.spread || 0 : 0}px ${rgbaCss(e.color)}`);
          }
        }
        return shadows.length ? shadows.join(", ") : null;
      }
      function blurToCss(effects) {
        for (const e of effects) {
          if (e.visible && e.type === "LAYER_BLUR")
            return `blur(${e.radius}px)`;
        }
        return null;
      }
      function hasImageFill(node) {
        if (!("fills" in node))
          return false;
        const fills = node.fills;
        if (fills === figma.mixed)
          return false;
        return fills.some((f) => f.type === "IMAGE" && f.visible !== false);
      }
      function parseNode(node, isSlotPhoto) {
        return __async(this, null, function* () {
          if (node.visible === false)
            return null;
          const res = {
            id: node.id,
            name: node.name,
            type: node.type,
            x: "x" in node ? Math.round(node.x) : 0,
            y: "y" in node ? Math.round(node.y) : 0,
            width: "width" in node ? Math.round(node.width) : 0,
            height: "height" in node ? Math.round(node.height) : 0,
            opacity: "opacity" in node ? node.opacity : 1
          };
          const match = node.name.match(/\[(.*?)\]/);
          if (match)
            res.slot = match[1].toLowerCase();
          if (res.slot === "image" || res.slot === "img")
            res.slot = "photo";
          if (res.slot === "text")
            res.slot = "body";
          if (res.slot === "button")
            res.slot = "cta";
          if ("effects" in node && node.effects.length) {
            const shadow = effectsToCss(node.effects);
            const blur = blurToCss(node.effects);
            if (shadow)
              res.boxShadow = shadow;
            if (blur)
              res.blur = blur;
          }
          if ("strokes" in node && node.strokes.length > 0 && node.strokes[0].type === "SOLID") {
            const w = typeof node.strokeWeight === "number" ? node.strokeWeight : 1;
            res.border = `${w}px solid ${rgbaCss(node.strokes[0].color, node.strokes[0].opacity)}`;
          }
          if ("cornerRadius" in node) {
            res.cornerRadius = typeof node.cornerRadius === "number" ? node.cornerRadius : 0;
          }
          const isPhoto = isSlotPhoto(node);
          if (isPhoto) {
            res.slot = "photo";
          } else if (hasImageFill(node) || node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION" || node.type === "STAR" || node.type === "POLYGON" || node.type === "LINE") {
            try {
              const bytes = yield node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
              res.imageData = "data:image/png;base64," + figma.base64Encode(bytes);
              res.type = "IMAGE_NODE";
              return res;
            } catch (e) {
            }
          }
          if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP") {
            const frame = node;
            res.clipsContent = "clipsContent" in frame ? frame.clipsContent : false;
            if ("layoutMode" in frame && frame.layoutMode !== "NONE") {
              res.layoutMode = frame.layoutMode;
              res.primaryAxisAlignItems = frame.primaryAxisAlignItems;
              res.counterAxisAlignItems = frame.counterAxisAlignItems;
              res.paddingTop = frame.paddingTop;
              res.paddingRight = frame.paddingRight;
              res.paddingBottom = frame.paddingBottom;
              res.paddingLeft = frame.paddingLeft;
              res.itemSpacing = frame.itemSpacing;
            }
            if ("fills" in frame && frame.fills !== figma.mixed && frame.fills.length > 0) {
              const css = paintToCss(frame.fills[frame.fills.length - 1]);
              if (css)
                res.background = css;
            }
            const kids = yield Promise.all(frame.children.map((c) => parseNode(c, isSlotPhoto)));
            res.children = kids.filter(Boolean);
          }
          if (node.type === "TEXT") {
            const text = node;
            res.characters = text.characters;
            res.fontSize = typeof text.fontSize === "number" ? text.fontSize : 16;
            res.fontName = typeof text.fontName !== "symbol" ? text.fontName : null;
            res.textAlignHorizontal = text.textAlignHorizontal;
            res.textAlignVertical = text.textAlignVertical;
            res.letterSpacing = typeof text.letterSpacing !== "symbol" ? text.letterSpacing : null;
            res.lineHeight = typeof text.lineHeight !== "symbol" ? text.lineHeight : null;
            if (text.fills !== figma.mixed && text.fills.length > 0 && text.fills[0].type === "SOLID") {
              res.color = rgbaCss(text.fills[0].color, text.fills[0].opacity);
            }
          }
          if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
            const shape = node;
            if (shape.fills !== figma.mixed && shape.fills.length > 0) {
              const css = paintToCss(shape.fills[shape.fills.length - 1]);
              if (css)
                res.background = css;
            }
            if (shape.type === "ELLIPSE")
              res.isEllipse = true;
          }
          return res;
        });
      }
      function extractSlots(frame) {
        let hasBody = false;
        let hasCta = false;
        let hasPhoto = false;
        function walk(node) {
          if (node.visible === false)
            return;
          const slotMatch = node.name.match(/\[(.*?)\]/);
          const slot = slotMatch ? slotMatch[1].toLowerCase() : null;
          if (slot === "body" || slot === "text")
            hasBody = true;
          if (slot === "cta" || slot === "button")
            hasCta = true;
          if (slot === "photo" || slot === "image" || slot === "img")
            hasPhoto = true;
          if ("children" in node) {
            for (const child of node.children)
              walk(child);
          }
        }
        walk(frame);
        return {
          headline: { enabled: true, removable: false, max: 120 },
          body: { enabled: hasBody, removable: true, max: 400 },
          cta: { enabled: hasCta, removable: true, max: 50 },
          photo: { enabled: hasPhoto, removable: false }
        };
      }
      function extractBrand(frame) {
        let bg = "#1A1A1A";
        if (frame.fills !== figma.mixed && frame.fills.length > 0 && frame.fills[0].type === "SOLID") {
          bg = rgbaToHex(frame.fills[0].color);
        }
        const colorSet = /* @__PURE__ */ new Set();
        function walk(node) {
          if (node.visible === false)
            return;
          if ("fills" in node) {
            const fills = node.fills;
            if (fills !== figma.mixed) {
              for (const fill of fills) {
                if (fill.type === "SOLID")
                  colorSet.add(rgbaToHex(fill.color));
              }
            }
          }
          if ("children" in node)
            for (const child of node.children)
              walk(child);
        }
        walk(frame);
        colorSet.delete(bg);
        const isDark = luminance(bg) < 0.3;
        const sorted = Array.from(colorSet).sort((a, c) => isDark ? luminance(c) - luminance(a) : luminance(a) - luminance(c));
        const primary = sorted[0] || (isDark ? "#FFFFFF" : "#111111");
        const accent = sorted.find((c) => Math.abs(luminance(c) - luminance(primary)) > 0.1) || sorted[1] || "#E8B04B";
        return { bg, primary, accent, logoText: frame.name, tagline: "", palette: [.../* @__PURE__ */ new Set([primary, accent, ...sorted])].slice(0, 6) };
      }
      figma.ui.onmessage = (msg) => __async(exports, null, function* () {
        if (msg.type === "export") {
          const selection = figma.currentPage.selection;
          if (selection.length !== 1 || selection[0].type !== "FRAME" && selection[0].type !== "COMPONENT") {
            figma.ui.postMessage({ type: "error", message: "\u0412\u0438\u0434\u0456\u043B\u0456\u0442\u044C \u0440\u0456\u0432\u043D\u043E \u043E\u0434\u0438\u043D \u0444\u0440\u0435\u0439\u043C \u0443 Figma." });
            return;
          }
          const frame = selection[0];
          const isSlotPhoto = (n) => /\[(photo|image|img)\]/i.test(n.name);
          try {
            const layout = yield parseNode(frame, isSlotPhoto);
            const brand = extractBrand(frame);
            const slots = extractSlots(frame);
            figma.ui.postMessage({ type: "export-result", layout, slots, brand });
          } catch (e) {
            figma.ui.postMessage({ type: "error", message: "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0447\u0438\u0442\u0430\u043D\u043D\u044F \u0444\u0440\u0435\u0439\u043C\u0443: " + (e && e.message ? e.message : e) });
          }
        }
      });
    }
  });
  require_code();
})();
