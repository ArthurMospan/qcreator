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
      function rgbaToHex(paint) {
        const r = Math.round(paint.color.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(paint.color.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(paint.color.b * 255).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
      }
      function luminance(hex) {
        const c = hex.replace("#", "");
        const r = parseInt(c.slice(0, 2), 16) / 255;
        const g = parseInt(c.slice(2, 4), 16) / 255;
        const b = parseInt(c.slice(4, 6), 16) / 255;
        const lin = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      }
      function parseNode(node) {
        if (node.visible === false)
          return null;
        const res = {
          id: node.id,
          name: node.name,
          type: node.type,
          x: "x" in node ? node.x : 0,
          y: "y" in node ? node.y : 0,
          width: "width" in node ? node.width : 0,
          height: "height" in node ? node.height : 0
        };
        const match = node.name.match(/\[(.*?)\]/);
        if (match)
          res.slot = match[1].toLowerCase();
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
          const frame = node;
          res.clipsContent = frame.clipsContent;
          res.cornerRadius = typeof frame.cornerRadius === "number" ? frame.cornerRadius : 0;
          if (frame.layoutMode !== "NONE") {
            res.layoutMode = frame.layoutMode;
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
      function extractBrand(frame) {
        let bg = "#1A1A1A";
        if (frame.fills !== figma.mixed && frame.fills.length > 0) {
          const fill = frame.fills[0];
          if (fill.type === "SOLID")
            bg = rgbaToHex(fill);
        }
        let logoText = frame.name;
        let tagline = "";
        const colorSet = /* @__PURE__ */ new Set();
        function walk(node) {
          if (node.visible === false)
            return;
          const nameLow = node.name.toLowerCase();
          if (node.type === "TEXT") {
            const text = node;
            if (nameLow.includes("[logo]") || nameLow === "logo") {
              logoText = text.characters.trim() || logoText;
            } else if (nameLow.includes("[tagline]") || nameLow === "tagline") {
              tagline = text.characters.trim();
            }
            if (text.fills !== figma.mixed && text.fills.length > 0) {
              const fill = text.fills[0];
              if (fill.type === "SOLID")
                colorSet.add(rgbaToHex(fill));
            }
          }
          if ("fills" in node) {
            const fills = node.fills;
            if (fills !== figma.mixed) {
              for (const fill of fills) {
                if (fill.type === "SOLID")
                  colorSet.add(rgbaToHex(fill));
              }
            }
          }
          if ("children" in node) {
            for (const child of node.children)
              walk(child);
          }
        }
        walk(frame);
        colorSet.delete(bg);
        const bgLum = luminance(bg);
        const isDark = bgLum < 0.3;
        const sorted = Array.from(colorSet).sort(
          (a, b) => isDark ? luminance(b) - luminance(a) : luminance(a) - luminance(b)
        );
        const primary = sorted[0] || (isDark ? "#FFFFFF" : "#111111");
        const accent = sorted.find((c) => Math.abs(luminance(c) - luminance(primary)) > 0.1) || sorted[1] || "#E8B04B";
        const palette = [.../* @__PURE__ */ new Set([primary, accent, ...sorted])].slice(0, 5);
        return { bg, primary, accent, logoText, tagline, palette };
      }
      function extractSlots(frame) {
        let hasHeadline = false;
        let hasBody = false;
        let hasCta = false;
        let hasPhoto = false;
        function walk(node) {
          if (node.visible === false)
            return;
          const nameLow = node.name.toLowerCase();
          const slotMatch = node.name.match(/\[(.*?)\]/);
          const slot = slotMatch ? slotMatch[1].toLowerCase() : null;
          if (slot === "headline" || nameLow === "headline")
            hasHeadline = true;
          if (slot === "body" || slot === "text" || nameLow === "body")
            hasBody = true;
          if (slot === "cta" || slot === "button" || nameLow === "cta")
            hasCta = true;
          if (slot === "photo" || slot === "image" || slot === "img")
            hasPhoto = true;
          if (node.type === "RECTANGLE" || node.type === "FRAME") {
            const fills = node.fills;
            if (fills !== figma.mixed) {
              for (const fill of fills) {
                if (fill.type === "IMAGE")
                  hasPhoto = true;
              }
            }
          }
          if ("children" in node) {
            for (const child of node.children)
              walk(child);
          }
        }
        walk(frame);
        return {
          headline: { enabled: true, removable: false, max: 100 },
          body: { enabled: hasBody, removable: true, max: 400 },
          cta: { enabled: hasCta, removable: true, max: 50 },
          photo: { enabled: hasPhoto, removable: false }
        };
      }
      figma.ui.onmessage = (msg) => __async(exports, null, function* () {
        if (msg.type === "export") {
          const selection = figma.currentPage.selection;
          if (selection.length !== 1 || selection[0].type !== "FRAME" && selection[0].type !== "COMPONENT") {
            figma.ui.postMessage({ type: "error", message: "\u0412\u0438\u0434\u0456\u043B\u0456\u0442\u044C \u0440\u0456\u0432\u043D\u043E \u043E\u0434\u0438\u043D \u0444\u0440\u0435\u0439\u043C \u0443 Figma." });
            return;
          }
          const frame = selection[0];
          const layout = parseNode(frame);
          const brand = extractBrand(frame);
          const slots = extractSlots(frame);
          figma.ui.postMessage({ type: "export-result", layout, slots, brand });
        }
      });
    }
  });
  require_code();
})();
