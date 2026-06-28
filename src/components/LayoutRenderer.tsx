"use client";
import React from 'react';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  slot?: string;
  // container
  background?: string;
  backgroundColor?: string;
  cornerRadius?: number;
  clipsContent?: boolean;
  boxShadow?: string;
  blur?: string;
  border?: string;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  children?: FigmaNode[];
  // text
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  color?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: { unit: string; value: number } | null;
  lineHeight?: { unit: string; value?: number } | null;
  // baked image / vector
  imageData?: string;
  isEllipse?: boolean;
}

interface Slide {
  headline: string;
  body: string;
  cta: string;
  showBody: boolean;
  showCta: boolean;
  img: string | null;
}

interface Props {
  layout: FigmaNode;
  slide: Slide;
  scale: number;
}

function toFontWeight(style?: string): number {
  if (!style) return 400;
  const s = style.toLowerCase();
  if (s.includes('thin')) return 100;
  if (s.includes('extralight') || s.includes('extra light') || s.includes('ultralight')) return 200;
  if (s.includes('semibold') || s.includes('semi bold') || s.includes('demi')) return 600;
  if (s.includes('extrabold') || s.includes('extra bold') || s.includes('ultrabold')) return 800;
  if (s.includes('black') || s.includes('heavy')) return 900;
  if (s.includes('medium')) return 500;
  if (s.includes('light')) return 300;
  if (s.includes('bold')) return 700;
  return 400;
}

function toLineHeight(lh: any): string | number {
  if (!lh || lh.unit === 'AUTO') return 'normal';
  if (lh.unit === 'PIXELS' && lh.value != null) return `${lh.value}px`;
  if (lh.unit === 'PERCENT' && lh.value != null) return lh.value / 100;
  return 'normal';
}

function toLetterSpacing(ls: any, fontSize: number): string {
  if (!ls || !ls.value) return 'normal';
  if (ls.unit === 'PERCENT') return `${(ls.value / 100) * fontSize}px`;
  return `${ls.value}px`;
}

function toJustify(v?: string): string {
  if (v === 'CENTER') return 'center';
  if (v === 'MAX') return 'flex-end';
  if (v === 'SPACE_BETWEEN') return 'space-between';
  return 'flex-start';
}
function toAlign(v?: string): string {
  if (v === 'CENTER') return 'center';
  if (v === 'MAX') return 'flex-end';
  return 'flex-start';
}

export function LayoutRenderer({ layout, slide, scale }: Props) {
  function slotText(slot?: string): string | null {
    if (slot === 'headline') return slide.headline;
    if (slot === 'body') return slide.body;
    if (slot === 'cta') return slide.cta;
    return null;
  }
  function isHidden(node: FigmaNode): boolean {
    if (node.slot === 'body' && !slide.showBody) return true;
    if (node.slot === 'cta' && !slide.showCta) return true;
    return false;
  }

  function renderNode(node: FigmaNode, parentAuto: boolean): React.ReactNode {
    if (isHidden(node)) return null;
    const sc = scale;

    const base: React.CSSProperties = parentAuto
      ? { width: node.width * sc, height: node.height * sc, flexShrink: 0 }
      : { position: 'absolute', left: node.x * sc, top: node.y * sc, width: node.width * sc, height: node.height * sc };

    if (node.opacity != null && node.opacity < 1) base.opacity = node.opacity;
    if (node.boxShadow) base.boxShadow = node.boxShadow;
    if (node.blur) base.filter = node.blur;
    if (node.border) base.border = node.border;
    base.boxSizing = 'border-box';

    // ── Baked image / vector node ──────────────────────────────────────
    if (node.type === 'IMAGE_NODE' || node.imageData) {
      return (
        <div key={node.id} style={{
          ...base,
          backgroundImage: `url(${node.imageData})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          borderRadius: (node.cornerRadius || 0) * sc,
        }} />
      );
    }

    // ── TEXT ───────────────────────────────────────────────────────────
    if (node.type === 'TEXT') {
      const content = slotText(node.slot) ?? node.characters ?? '';
      const fs = (node.fontSize || 16) * sc;
      return (
        <div key={node.id} style={{
          ...base,
          fontSize: fs,
          color: node.color || '#000',
          fontFamily: node.fontName?.family ? `"${node.fontName.family}", sans-serif` : 'inherit',
          fontWeight: toFontWeight(node.fontName?.style),
          fontStyle: node.fontName?.style?.toLowerCase().includes('italic') ? 'italic' : 'normal',
          textAlign: (node.textAlignHorizontal?.toLowerCase() as any) || 'left',
          lineHeight: toLineHeight(node.lineHeight),
          letterSpacing: toLetterSpacing(node.letterSpacing, fs),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: node.textAlignVertical === 'CENTER' ? 'center' : node.textAlignVertical === 'BOTTOM' ? 'flex-end' : 'flex-start',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}>
          <span style={{ width: '100%' }}>{content}</span>
        </div>
      );
    }

    // ── RECTANGLE / ELLIPSE ────────────────────────────────────────────
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      const isPhoto = node.slot === 'photo';
      const style: React.CSSProperties = {
        ...base,
        borderRadius: node.isEllipse ? '50%' : (node.cornerRadius || 0) * sc,
        overflow: 'hidden',
      };
      if (isPhoto) {
        if (slide.img) {
          style.backgroundImage = `url(${slide.img})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
        } else {
          style.background = node.background || node.backgroundColor || '#d1d5db';
        }
      } else {
        style.background = node.background || node.backgroundColor || 'transparent';
      }
      return <div key={node.id} style={style} />;
    }

    // ── FRAME / GROUP / COMPONENT / INSTANCE ───────────────────────────
    const isPhotoFrame = node.slot === 'photo';
    const isAuto = !!node.layoutMode && node.layoutMode !== 'NONE';
    const style: React.CSSProperties = {
      ...base,
      background: node.background || node.backgroundColor || 'transparent',
      borderRadius: (node.cornerRadius || 0) * sc,
      overflow: node.clipsContent ? 'hidden' : 'visible',
    };

    if (isPhotoFrame) {
      style.overflow = 'hidden';
      if (slide.img) {
        style.backgroundImage = `url(${slide.img})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
      } else if (!node.background) {
        style.background = '#d1d5db';
      }
      return <div key={node.id} style={style} />;
    }

    if (isAuto) {
      style.display = 'flex';
      style.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
      style.justifyContent = toJustify(node.primaryAxisAlignItems);
      style.alignItems = toAlign(node.counterAxisAlignItems);
      style.paddingTop = (node.paddingTop || 0) * sc;
      style.paddingRight = (node.paddingRight || 0) * sc;
      style.paddingBottom = (node.paddingBottom || 0) * sc;
      style.paddingLeft = (node.paddingLeft || 0) * sc;
      style.gap = (node.itemSpacing || 0) * sc;
    }

    return (
      <div key={node.id} style={style}>
        {(node.children || []).map(c => renderNode(c, isAuto))}
      </div>
    );
  }

  const rootStyle: React.CSSProperties = {
    position: 'relative',
    width: layout.width * scale,
    height: layout.height * scale,
    background: layout.background || layout.backgroundColor || '#ffffff',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  return (
    <div style={rootStyle}>
      {(layout.children || []).map(child => renderNode(child, false))}
    </div>
  );
}
