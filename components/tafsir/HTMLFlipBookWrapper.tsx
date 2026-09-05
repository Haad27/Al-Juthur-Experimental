"use client";

import React, {
  ReactElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// @ts-ignore
import { PageFlip } from "page-flip";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlipSetting {
  width: number;
  height: number;
  size?: "fixed" | "stretch";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  drawShadow?: boolean;
  flippingTime?: number;
  usePortrait?: boolean;
  startZIndex?: number;
  autoSize?: boolean;
  maxShadowOpacity?: number;
  showCover?: boolean;
  mobileScrollSupport?: boolean;
  swipeDistance?: number;
  clickEventForward?: boolean;
  useMouseEvents?: boolean;
  renderOnlyPageLengthChange?: boolean;
  startPage?: number;
}

export interface FlipBookHandle {
  pageFlip: () => PageFlip | undefined;
}

interface Props extends FlipSetting {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onFlip?: (e: any) => void;
  onChangeOrientation?: (e: any) => void;
  onChangeState?: (e: any) => void;
  onInit?: (e: any) => void;
  onUpdate?: (e: any) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const HTMLFlipBookInner = React.forwardRef<FlipBookHandle, Props>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const childRefs = useRef<HTMLElement[]>([]);
    const pageFlipRef = useRef<PageFlip | undefined>(undefined);
    const [pages, setPages] = useState<ReactElement[]>([]);

    useImperativeHandle(ref, () => ({
      pageFlip: () => pageFlipRef.current,
    }));

    const removeHandlers = useCallback(() => {
      const flip = pageFlipRef.current;
      if (flip) {
        flip.off("flip");
        flip.off("changeOrientation");
        flip.off("changeState");
        flip.off("init");
        flip.off("update");
      }
    }, []);

    // Collect child DOM elements and update pages state
    useEffect(() => {
      childRefs.current = [];
      if (!props.children) return;

      const childList = React.Children.map(props.children, (child) => {
        return React.cloneElement(child as any, {
          ref: (dom: HTMLElement | null) => {
            if (dom) childRefs.current.push(dom);
          },
        });
      });

      if (!childList) return;

      if (
        !props.renderOnlyPageLengthChange ||
        pages.length !== childList.length
      ) {
        if (childList.length < pages.length && pageFlipRef.current) {
          pageFlipRef.current.clear();
        }
        setPages(childList);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.children]);

    // Init / update PageFlip when pages change
    useEffect(() => {
      if (pages.length === 0 || childRefs.current.length === 0) return;
      if (!containerRef.current) return;

      removeHandlers();

      if (!pageFlipRef.current) {
        pageFlipRef.current = new PageFlip(containerRef.current, {
          width: props.width,
          height: props.height,
          size: props.size ?? "fixed",
          minWidth: props.minWidth,
          maxWidth: props.maxWidth,
          minHeight: props.minHeight,
          maxHeight: props.maxHeight,
          drawShadow: props.drawShadow ?? true,
          flippingTime: props.flippingTime ?? 800,
          usePortrait: props.usePortrait ?? true,
          startZIndex: props.startZIndex ?? 0,
          autoSize: props.autoSize ?? true,
          maxShadowOpacity: props.maxShadowOpacity ?? 0.5,
          showCover: props.showCover ?? false,
          mobileScrollSupport: props.mobileScrollSupport ?? true,
          swipeDistance: props.swipeDistance ?? 30,
          clickEventForward: props.clickEventForward ?? true,
          useMouseEvents: props.useMouseEvents ?? true,
          startPage: props.startPage ?? 0,
        } as any);
      }

      if (!pageFlipRef.current.getFlipController()) {
        pageFlipRef.current.loadFromHTML(childRefs.current);
      } else {
        pageFlipRef.current.updateFromHtml(childRefs.current);
      }

      // Attach event handlers
      const flip = pageFlipRef.current;
      if (props.onFlip) flip.on("flip", (e: any) => props.onFlip!(e));
      if (props.onChangeOrientation)
        flip.on("changeOrientation", (e: any) => props.onChangeOrientation!(e));
      if (props.onChangeState)
        flip.on("changeState", (e: any) => props.onChangeState!(e));
      if (props.onInit) flip.on("init", (e: any) => props.onInit!(e));
      if (props.onUpdate) flip.on("update", (e: any) => props.onUpdate!(e));

      return () => {
        removeHandlers();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages]);

    return (
      <div ref={containerRef} className={props.className} style={props.style}>
        {pages}
      </div>
    );
  }
);

HTMLFlipBookInner.displayName = "HTMLFlipBook";

export const HTMLFlipBook = React.memo(HTMLFlipBookInner);
