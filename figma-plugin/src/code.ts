figma.showUI(__html__, { width: 320, height: 440 });

function rgbaToHex(paint: SolidPaint): string {
  const r = Math.round(paint.color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(paint.color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(paint.color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function parseNode(node: SceneNode): any {
  if (node.visible === false) return null;

  const res: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? (node as any).x : 0,
    y: 'y' in node ? (node as any).y : 0,
    width: 'width' in node ? (node as any).width : 0,
    height: 'height' in node ? (node as any).height : 0,
  };

  const match = node.name.match(/\[(.*?)\]/);
  if (match) res.slot = match[1].toLowerCase();

  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frame = node as FrameNode;
    res.clipsContent = frame.clipsContent;
    res.cornerRadius = typeof frame.cornerRadius === 'number' ? frame.cornerRadius : 0;

    if (frame.layoutMode !== 'NONE') {
      res.layoutMode = frame.layoutMode;
      res.paddingTop = frame.paddingTop;
      res.paddingRight = frame.paddingRight;
      res.paddingBottom = frame.paddingBottom;
      res.paddingLeft = frame.paddingLeft;
      res.itemSpacing = frame.itemSpacing;
    }

    if (frame.fills !== figma.mixed && frame.fills.length > 0) {
      const fill = frame.fills[0];
      if (fill.type === 'SOLID') res.backgroundColor = rgbaToHex(fill);
    }

    res.children = frame.children.map(parseNode).filter(Boolean);
  }

  if (node.type === 'TEXT') {
    const text = node as TextNode;
    res.characters = text.characters;
    res.fontSize = typeof text.fontSize === 'number' ? text.fontSize : 16;
    res.fontName = typeof text.fontName !== 'symbol' ? text.fontName : null;
    res.textAlignHorizontal = text.textAlignHorizontal;

    if (text.fills !== figma.mixed && text.fills.length > 0) {
      const fill = text.fills[0];
      if (fill.type === 'SOLID') res.color = rgbaToHex(fill);
    }
  }

  if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
    const shape = node as RectangleNode | EllipseNode;
    if (shape.fills !== figma.mixed && shape.fills.length > 0) {
      const fill = shape.fills[0];
      if (fill.type === 'SOLID') res.backgroundColor = rgbaToHex(fill);
      else if (fill.type === 'IMAGE') res.isImage = true;
    }
    if (shape.type === 'RECTANGLE') {
      res.cornerRadius = typeof shape.cornerRadius === 'number' ? shape.cornerRadius : 0;
    } else {
      res.isEllipse = true;
    }
  }

  return res;
}

// Read real brand data from the Figma frame instead of hardcoding
function extractBrand(frame: FrameNode): Record<string, any> {
  // Background from frame fill
  let bg = '#1A1A1A';
  if (frame.fills !== figma.mixed && frame.fills.length > 0) {
    const fill = frame.fills[0];
    if (fill.type === 'SOLID') bg = rgbaToHex(fill);
  }

  let logoText = frame.name;
  let tagline = '';
  const colorSet = new Set<string>();

  function walk(node: SceneNode) {
    if (node.visible === false) return;
    const nameLow = node.name.toLowerCase();

    if (node.type === 'TEXT') {
      const text = node as TextNode;
      // Pick up logo/tagline from specially named layers
      if (nameLow.includes('[logo]') || nameLow === 'logo') {
        logoText = text.characters.trim() || logoText;
      } else if (nameLow.includes('[tagline]') || nameLow === 'tagline') {
        tagline = text.characters.trim();
      }
      if (text.fills !== figma.mixed && text.fills.length > 0) {
        const fill = text.fills[0];
        if (fill.type === 'SOLID') colorSet.add(rgbaToHex(fill));
      }
    }

    if ('fills' in node) {
      const fills = (node as GeometryMixin).fills;
      if (fills !== figma.mixed) {
        for (const fill of fills as ReadonlyArray<Paint>) {
          if (fill.type === 'SOLID') colorSet.add(rgbaToHex(fill as SolidPaint));
        }
      }
    }

    if ('children' in node) {
      for (const child of (node as ChildrenMixin).children) walk(child);
    }
  }

  walk(frame);
  colorSet.delete(bg); // bg is separate

  const bgLum = luminance(bg);
  const isDark = bgLum < 0.3;

  // Sort: if dark bg → brightest colors first; if light bg → darkest colors first
  const sorted = Array.from(colorSet).sort((a, b) =>
    isDark ? luminance(b) - luminance(a) : luminance(a) - luminance(b)
  );

  const primary = sorted[0] || (isDark ? '#FFFFFF' : '#111111');
  // Accent = most luminance-different from primary
  const accent = sorted.find(c => Math.abs(luminance(c) - luminance(primary)) > 0.1)
    || sorted[1]
    || '#E8B04B';
  const palette = [...new Set([primary, accent, ...sorted])].slice(0, 5);

  return { bg, primary, accent, logoText, tagline, palette };
}

// Detect which slots are present in the frame
function extractSlots(frame: FrameNode): Record<string, any> {
  let hasHeadline = false;
  let hasBody = false;
  let hasCta = false;
  let hasPhoto = false;

  function walk(node: SceneNode) {
    if (node.visible === false) return;
    const nameLow = node.name.toLowerCase();
    const slotMatch = node.name.match(/\[(.*?)\]/);
    const slot = slotMatch ? slotMatch[1].toLowerCase() : null;

    if (slot === 'headline' || nameLow === 'headline') hasHeadline = true;
    if (slot === 'body' || slot === 'text' || nameLow === 'body') hasBody = true;
    if (slot === 'cta' || slot === 'button' || nameLow === 'cta') hasCta = true;
    if (slot === 'photo' || slot === 'image' || slot === 'img') hasPhoto = true;

    // Also detect image fill placeholders as photo slots
    if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
      const fills = (node as GeometryMixin).fills;
      if (fills !== figma.mixed) {
        for (const fill of fills as ReadonlyArray<Paint>) {
          if (fill.type === 'IMAGE') hasPhoto = true;
        }
      }
    }

    if ('children' in node) {
      for (const child of (node as ChildrenMixin).children) walk(child);
    }
  }

  walk(frame);

  return {
    headline: { enabled: true, removable: false, max: 100 },
    body: { enabled: hasBody, removable: true, max: 400 },
    cta: { enabled: hasCta, removable: true, max: 50 },
    photo: { enabled: hasPhoto, removable: false },
  };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export') {
    const selection = figma.currentPage.selection;
    if (
      selection.length !== 1 ||
      (selection[0].type !== 'FRAME' && selection[0].type !== 'COMPONENT')
    ) {
      figma.ui.postMessage({ type: 'error', message: 'Виділіть рівно один фрейм у Figma.' });
      return;
    }

    const frame = selection[0] as FrameNode;
    const layout = parseNode(frame);
    const brand = extractBrand(frame);
    const slots = extractSlots(frame);

    figma.ui.postMessage({ type: 'export-result', layout, slots, brand });
  }
};
