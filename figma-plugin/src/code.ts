figma.showUI(__html__, { width: 320, height: 440 });

function rgbaToHex(color: RGB | RGBA, opacity?: number): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  const a = ('a' in color ? color.a : 1) * (opacity ?? 1);
  if (a >= 1) return `#${r}${g}${b}`;
  const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${aHex}`;
}

function rgbaCss(color: RGB | RGBA, opacity?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = ('a' in color ? color.a : 1) * (opacity ?? 1);
  return `rgba(${r},${g},${b},${a})`;
}

function luminance(hex: string): number {
  const c = hex.replace('#', '').slice(0, 6);
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Build a CSS background value (solid, gradient) from a Figma paint
function paintToCss(paint: Paint): string | null {
  if (paint.visible === false) return null;
  if (paint.type === 'SOLID') {
    return rgbaCss(paint.color, paint.opacity);
  }
  if (paint.type === 'GRADIENT_LINEAR') {
    const stops = paint.gradientStops
      .map(s => `${rgbaCss(s.color, paint.opacity)} ${Math.round(s.position * 100)}%`)
      .join(', ');
    // Approximate gradient angle from the transform handles
    const [[a, b]] = paint.gradientTransform;
    const angle = Math.round((Math.atan2(b, a) * 180) / Math.PI) + 90;
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  if (paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_DIAMOND') {
    const stops = paint.gradientStops
      .map(s => `${rgbaCss(s.color, paint.opacity)} ${Math.round(s.position * 100)}%`)
      .join(', ');
    return `radial-gradient(circle, ${stops})`;
  }
  return null;
}

function effectsToCss(effects: readonly Effect[]): string | null {
  const shadows: string[] = [];
  for (const e of effects) {
    if (!e.visible) continue;
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      const inset = e.type === 'INNER_SHADOW' ? 'inset ' : '';
      shadows.push(`${inset}${e.offset.x}px ${e.offset.y}px ${e.radius}px ${('spread' in e ? e.spread || 0 : 0)}px ${rgbaCss(e.color)}`);
    }
  }
  return shadows.length ? shadows.join(', ') : null;
}

function blurToCss(effects: readonly Effect[]): string | null {
  for (const e of effects) {
    if (e.visible && e.type === 'LAYER_BLUR') return `blur(${e.radius}px)`;
  }
  return null;
}

// Does this node (or its fills) contain an image that should be baked to PNG?
function hasImageFill(node: SceneNode): boolean {
  if (!('fills' in node)) return false;
  const fills = (node as GeometryMixin).fills;
  if (fills === figma.mixed) return false;
  return (fills as ReadonlyArray<Paint>).some(f => f.type === 'IMAGE' && f.visible !== false);
}

async function parseNode(node: SceneNode, parentAbs: { x: number; y: number } | null, isSlotPhoto: (n: SceneNode) => boolean): Promise<any> {
  if (node.visible === false) return null;

  const res: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? Math.round((node as any).x) : 0,
    y: 'y' in node ? Math.round((node as any).y) : 0,
    width: 'width' in node ? Math.round((node as any).width) : 0,
    height: 'height' in node ? Math.round((node as any).height) : 0,
    opacity: 'opacity' in node ? (node as any).opacity : 1,
  };

  const match = node.name.match(/\[(.*?)\]/);
  if (match) res.slot = match[1].toLowerCase();
  if (res.slot === 'image' || res.slot === 'img') res.slot = 'photo';
  if (res.slot === 'text') res.slot = 'body';
  if (res.slot === 'button') res.slot = 'cta';

  // Effects (shadows / blur)
  if ('effects' in node && node.effects.length) {
    const shadow = effectsToCss(node.effects);
    const blur = blurToCss(node.effects);
    if (shadow) res.boxShadow = shadow;
    if (blur) res.blur = blur;
  }

  // Strokes -> border
  if ('strokes' in node && node.strokes.length > 0 && node.strokes[0].type === 'SOLID') {
    const w = typeof node.strokeWeight === 'number' ? node.strokeWeight : 1;
    res.border = `${w}px solid ${rgbaCss((node.strokes[0] as SolidPaint).color, (node.strokes[0] as SolidPaint).opacity)}`;
  }

  // Corner radius
  if ('cornerRadius' in node) {
    res.cornerRadius = typeof (node as any).cornerRadius === 'number' ? (node as any).cornerRadius : 0;
  }

  // If this node carries an image fill and is NOT the editable photo slot,
  // bake it to a PNG so it renders pixel-perfect in the editor.
  const isPhoto = isSlotPhoto(node);
  if (isPhoto) {
    res.slot = 'photo';
  } else if (hasImageFill(node) || node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR' || node.type === 'POLYGON' || node.type === 'LINE') {
    try {
      const bytes = await (node as any).exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
      res.imageData = 'data:image/png;base64,' + figma.base64Encode(bytes);
      res.type = 'IMAGE_NODE';
      // The exported PNG is the node's absolute (rotation-aware) bounding box.
      // Position it by that box relative to the parent so rotated/vector nodes
      // line up exactly instead of using the unrotated geometry x/y.
      const bb = (node as any).absoluteBoundingBox;
      if (bb && parentAbs) {
        res.x = Math.round(bb.x - parentAbs.x);
        res.y = Math.round(bb.y - parentAbs.y);
        res.width = Math.round(bb.width);
        res.height = Math.round(bb.height);
      }
      return res; // baked — no need to descend into children
    } catch (e) {
      // fall through to normal handling
    }
  }

  // Frame-like containers
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'GROUP') {
    const frame = node as FrameNode;
    res.clipsContent = 'clipsContent' in frame ? frame.clipsContent : false;

    if ('layoutMode' in frame && frame.layoutMode !== 'NONE') {
      res.layoutMode = frame.layoutMode;
      res.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      res.counterAxisAlignItems = frame.counterAxisAlignItems;
      res.paddingTop = frame.paddingTop;
      res.paddingRight = frame.paddingRight;
      res.paddingBottom = frame.paddingBottom;
      res.paddingLeft = frame.paddingLeft;
      res.itemSpacing = frame.itemSpacing;
    }

    if ('fills' in frame && frame.fills !== figma.mixed && frame.fills.length > 0) {
      const css = paintToCss(frame.fills[frame.fills.length - 1]);
      if (css) res.background = css;
    }

    const myAbs = (frame as any).absoluteBoundingBox || parentAbs;
    const kids = await Promise.all(frame.children.map(c => parseNode(c, myAbs, isSlotPhoto)));
    res.children = kids.filter(Boolean);
  }

  if (node.type === 'TEXT') {
    const text = node as TextNode;
    res.characters = text.characters;
    res.fontSize = typeof text.fontSize === 'number' ? text.fontSize : 16;
    res.fontName = typeof text.fontName !== 'symbol' ? text.fontName : null;
    res.textAlignHorizontal = text.textAlignHorizontal;
    res.textAlignVertical = text.textAlignVertical;
    res.letterSpacing = typeof text.letterSpacing !== 'symbol' ? text.letterSpacing : null;
    res.lineHeight = typeof text.lineHeight !== 'symbol' ? text.lineHeight : null;

    if (text.fills !== figma.mixed && text.fills.length > 0 && text.fills[0].type === 'SOLID') {
      res.color = rgbaCss((text.fills[0] as SolidPaint).color, (text.fills[0] as SolidPaint).opacity);
    }
  }

  if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
    const shape = node as RectangleNode | EllipseNode;
    if (shape.fills !== figma.mixed && shape.fills.length > 0) {
      const css = paintToCss(shape.fills[shape.fills.length - 1]);
      if (css) res.background = css;
    }
    if (shape.type === 'ELLIPSE') res.isEllipse = true;
  }

  return res;
}

// Detect which slots are present in the frame
function extractSlots(frame: FrameNode): Record<string, any> {
  let hasBody = false;
  let hasCta = false;
  let hasPhoto = false;

  function walk(node: SceneNode) {
    if (node.visible === false) return;
    const slotMatch = node.name.match(/\[(.*?)\]/);
    const slot = slotMatch ? slotMatch[1].toLowerCase() : null;

    if (slot === 'body' || slot === 'text') hasBody = true;
    if (slot === 'cta' || slot === 'button') hasCta = true;
    if (slot === 'photo' || slot === 'image' || slot === 'img') hasPhoto = true;

    if ('children' in node) {
      for (const child of (node as ChildrenMixin).children) walk(child);
    }
  }
  walk(frame);

  return {
    headline: { enabled: true, removable: false, max: 120 },
    body: { enabled: hasBody, removable: true, max: 400 },
    cta: { enabled: hasCta, removable: true, max: 50 },
    photo: { enabled: hasPhoto, removable: false },
  };
}

function extractBrand(frame: FrameNode): Record<string, any> {
  let bg = '#1A1A1A';
  if (frame.fills !== figma.mixed && frame.fills.length > 0 && frame.fills[0].type === 'SOLID') {
    bg = rgbaToHex((frame.fills[0] as SolidPaint).color);
  }
  const colorSet = new Set<string>();
  function walk(node: SceneNode) {
    if (node.visible === false) return;
    if ('fills' in node) {
      const fills = (node as GeometryMixin).fills;
      if (fills !== figma.mixed) {
        for (const fill of fills as ReadonlyArray<Paint>) {
          if (fill.type === 'SOLID') colorSet.add(rgbaToHex(fill.color));
        }
      }
    }
    if ('children' in node) for (const child of (node as ChildrenMixin).children) walk(child);
  }
  walk(frame);
  colorSet.delete(bg);
  const isDark = luminance(bg) < 0.3;
  const sorted = Array.from(colorSet).sort((a, c) => isDark ? luminance(c) - luminance(a) : luminance(a) - luminance(c));
  const primary = sorted[0] || (isDark ? '#FFFFFF' : '#111111');
  const accent = sorted.find(c => Math.abs(luminance(c) - luminance(primary)) > 0.1) || sorted[1] || '#E8B04B';
  return { bg, primary, accent, logoText: frame.name, tagline: '', palette: [...new Set([primary, accent, ...sorted])].slice(0, 6) };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export') {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1 || (selection[0].type !== 'FRAME' && selection[0].type !== 'COMPONENT')) {
      figma.ui.postMessage({ type: 'error', message: 'Виділіть рівно один фрейм у Figma.' });
      return;
    }

    const frame = selection[0] as FrameNode;
    const isSlotPhoto = (n: SceneNode) => /\[(photo|image|img)\]/i.test(n.name);

    try {
      const layout = await parseNode(frame, (frame as any).absoluteBoundingBox || null, isSlotPhoto);
      const brand = extractBrand(frame);
      const slots = extractSlots(frame);
      figma.ui.postMessage({ type: 'export-result', layout, slots, brand });
    } catch (e: any) {
      figma.ui.postMessage({ type: 'error', message: 'Помилка читання фрейму: ' + (e && e.message ? e.message : e) });
    }
  }
};
