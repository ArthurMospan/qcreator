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
  slot?: string;
  // Frame
  backgroundColor?: string;
  cornerRadius?: number;
  clipsContent?: boolean;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  children?: FigmaNode[];
  // Text
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  color?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  lineHeight?: { unit: string; value?: number };
  // Shape
  isImage?: boolean;
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
  if (s.includes('extralight') || s.includes('extra light')) return 200;
  if (s.includes('light')) return 300;
  if (s.includes('semibold') || s.includes('semi bold') || s.includes('demi')) return 600;
  if (s.includes('extrabold') || s.includes('extra bold') || s.includes('black') || s.includes('heavy')) return 800;
  if (s.includes('medium')) return 500;
  if (s.includes('bold')) return 700;
  return 400;
}

function toLineHeight(lh: any): string | number {
  if (!lh || lh.unit === 'AUTO') return 1.2;
  if (lh.unit === 'PIXELS' && lh.value) return `${lh.value}px`;
  if (lh.unit === 'PERCENT' && lh.value) return lh.value / 100;
  return 1.2;
}

function toFlexJustify(v?: string): string {
  if (!v) return 'flex-start';
  if (v === 'CENTER') return 'center';
  if (v === 'MAX') return 'flex-end';
  if (v === 'SPACE_BETWEEN') return 'space-between';
  return 'flex-start';
}

function toFlexAlign(v?: string): string {
  if (!v) return 'flex-start';
  if (v === 'CENTER') return 'center';
  if (v === 'MAX') return 'flex-end';
  return 'flex-start';
}

export function LayoutRenderer({ layout, slide, scale }: Props) {
  function slotText(slot?: string): string | null {
    if (!slot) return null;
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

  function renderNode(node: FigmaNode, parentAutoLayout = false): React.ReactNode {
    if (isHidden(node)) return null;

    const sc = scale;
    // Positioned style — inside auto-layout parent we don't use left/top
    const posStyle: React.CSSProperties = parentAutoLayout
      ? { width: node.width * sc, height: node.height * sc, flexShrink: 0 }
      : { position: 'absolute', left: node.x * sc, top: node.y * sc, width: node.width * sc, height: node.height * sc };

    // ── TEXT ─────────────────────────────────────────────────────────────
    if (node.type === 'TEXT') {
      const content = slotText(node.slot) ?? node.characters ?? '';
      return (
        <div
          key={node.id}
          style={{
            ...posStyle,
            fontSize: (node.fontSize || 16) * sc,
            color: node.color || '#000000',
            fontFamily: node.fontName?.family || 'inherit',
            fontWeight: toFontWeight(node.fontName?.style),
            textAlign: (node.textAlignHorizontal?.toLowerCase() as React.CSSProperties['textAlign']) || 'left',
            lineHeight: toLineHeight(node.lineHeight),
            display: 'flex',
            alignItems:
              node.textAlignVertical === 'CENTER' ? 'center' :
              node.textAlignVertical === 'BOTTOM' ? 'flex-end' : 'flex-start',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ width: '100%' }}>{content}</span>
        </div>
      );
    }

    // ── RECTANGLE / ELLIPSE ───────────────────────────────────────────────
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      const isPhoto = node.slot === 'photo' || node.isImage;
      const style: React.CSSProperties = {
        ...posStyle,
        borderRadius: node.isEllipse ? '50%' : (node.cornerRadius || 0) * sc,
        overflow: 'hidden',
        boxSizing: 'border-box',
      };
      if (isPhoto) {
        if (slide.img) {
          style.backgroundImage = `url(${slide.img})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
        } else {
          style.background = '#d1d5db';
        }
      } else {
        style.background = node.backgroundColor || 'transparent';
      }
      return <div key={node.id} style={style} />;
    }

    // ── FRAME / COMPONENT / INSTANCE ─────────────────────────────────────
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const isAuto = !!node.layoutMode && node.layoutMode !== 'NONE';
      const children = (node.children || []).map(c => renderNode(c, isAuto));

      const style: React.CSSProperties = {
        ...posStyle,
        background: node.backgroundColor || 'transparent',
        borderRadius: (node.cornerRadius || 0) * sc,
        overflow: node.clipsContent ? 'hidden' : 'visible',
        boxSizing: 'border-box',
      };

      if (isAuto) {
        style.display = 'flex';
        style.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
        style.justifyContent = toFlexJustify(node.primaryAxisAlignItems);
        style.alignItems = toFlexAlign(node.counterAxisAlignItems);
        style.paddingTop = (node.paddingTop || 0) * sc;
        style.paddingRight = (node.paddingRight || 0) * sc;
        style.paddingBottom = (node.paddingBottom || 0) * sc;
        style.paddingLeft = (node.paddingLeft || 0) * sc;
        style.gap = (node.itemSpacing || 0) * sc;
      }

      return (
        <div key={node.id} style={style}>
          {children}
        </div>
      );
    }

    return null;
  }

  // Root frame — rendered as a relative container so children (position:absolute) are scoped to it
  const rootStyle: React.CSSProperties = {
    position: 'relative',
    width: layout.width * scale,
    height: layout.height * scale,
    background: layout.backgroundColor || '#ffffff',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  return (
    <div style={rootStyle}>
      {(layout.children || []).map(child => renderNode(child, false))}
    </div>
  );
}
